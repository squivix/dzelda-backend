import amqp from "amqplib";
import {MikroORM, QueryOrder, SqlEntityManager} from "@mikro-orm/postgresql";
import options from "@/src/mikro-orm.config.js";
import {Text} from "@/src/models/entities/Text.js";
import {getParser} from "dzelda-common";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapTextVocab} from "@/src/models/entities/MapTextVocab.js";
import {VocabVariant} from "@/src/models/entities/VocabVariant.js";
import {EntityData} from "@mikro-orm/core";

const QUEUE_KEY = "parseTextWorkerQueue";
const PARSE_TEXT_WORKER_MAX_RETRIES = 50;
const DEAD_LETTER_QUEUE_KEY = "parseTextWorkerDeadLetterQueue";

async function consume() {
    const connection = await amqp.connect(process.env.RABBITMQ_CONNECTION_URL!, {heartbeat: 20});
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_KEY, {
        durable: true,
        maxPriority: 2
    });
    await channel.assertQueue(DEAD_LETTER_QUEUE_KEY, {
        durable: true
    });
    await channel.prefetch(Number(process.env.PARSE_TEXT_WORKER_PREFETCH) || 4);
    console.log(`Text parser worker listening on ${QUEUE_KEY}...`);

    await channel.consume(QUEUE_KEY, async (msg) => {
        if (!msg)
            return;
        const args: { textId: number } = JSON.parse(msg.content.toString());
        const attempts = msg.properties.headers?.attempts ? Number(msg.properties.headers.attempts) : 0;
        console.log(`Received request to parse text(id=${args.textId}), attempt ${attempts + 1}`);

        const orm = await MikroORM.init(options);
        const em = orm.em.fork() as SqlEntityManager;
        const text = await em.findOne(Text, {id: args.textId}, {populate: ["language"], fields: ["*", "language.code", "language.id"]});
        if (!text) {
            console.log(`Text (id=${args.textId}) not found`);
            await orm.close()
            channel.ack(msg);
            return;
        }
        await em.transactional(async (tm) => {
            await tm.nativeUpdate(Text, {id: text.id}, {
                parsedTitle: null,
                parsedContent: null,
                isProcessing: true
            });

            const parser = getParser(text.language.code);
            const titleParseResult = parser.parseText(text.title);
            const contentParseResult = parser.parseText(text.content);

            const textWords: string[] = Array.from(new Set([
                ...titleParseResult.normalizedWords,
                ...contentParseResult.normalizedWords
            ]));
            textWords.sort();   //important to avoid deadlocks

            await em.nativeDelete(MapTextVocab, {text: text.id, vocab: {text: {$nin: textWords}}});
            await tm.upsertMany(Vocab, textWords.map(word => ({text: word, language: text.language.id})));

            const textVocabs = await tm.createQueryBuilder(Vocab).select("*").where({language: text.language}).andWhere(`? LIKE '% ' || text || ' %'`, [` ${titleParseResult.normalizedText} ${contentParseResult.normalizedText} `]).orderBy({id: QueryOrder.ASC});
            await tm.upsertMany(MapTextVocab, textVocabs.map(vocab => ({text: text.id, vocab: vocab.id})));

            const variants = [] as EntityData<VocabVariant>[];
            for (const vocab of textVocabs) {
                if (!titleParseResult.wordToVariantsMap[vocab.text] && !contentParseResult.wordToVariantsMap[vocab.text])
                    continue;
                const variantsMap = titleParseResult.wordToVariantsMap[vocab.text] ?? contentParseResult.wordToVariantsMap[vocab.text];
                for (const variantText of variantsMap)
                    variants.push({vocab: vocab.id, text: variantText});
            }
            await tm.upsertMany(VocabVariant, variants, {onConflictAction: "ignore"});

            await tm.nativeUpdate(Text, {id: text.id}, {
                parsedTitle: titleParseResult.normalizedText,
                parsedContent: contentParseResult.normalizedText,
                isProcessing: false
            });
        }).then(() => {
            console.log(`Text(id=${args.textId}) parsed successfully`);
            orm.close().then(() => channel.ack(msg));
        }).catch((e) => {
            console.log(`Text(id=${args.textId}) parsing failed`);
            console.error(e);
            orm.close().then(() => {
                const nextAttempts = attempts + 1;
                if (nextAttempts >= PARSE_TEXT_WORKER_MAX_RETRIES) {
                    console.log(`Moving text(id=${args.textId}) to dead letter queue`);
                    channel.sendToQueue(DEAD_LETTER_QUEUE_KEY, msg.content, {
                        persistent: true,
                        headers: {attempts: nextAttempts},
                        priority: msg.properties.priority
                    });
                } else {
                    channel.sendToQueue(QUEUE_KEY, msg.content, {
                        persistent: true,
                        headers: {attempts: nextAttempts},
                        priority: msg.properties.priority
                    });
                }
                channel.ack(msg);
            });
        });
    });
}


consume().catch(console.error);
