import amqp from "amqplib";
import {MikroORM, QueryOrder, SqlEntityManager} from "@mikro-orm/postgresql";
import options from "@/src/mikro-orm.config.js";
import {Text} from "@/src/models/entities/Text.js";
import {getParser} from "dzelda-common";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapTextVocab} from "@/src/models/entities/MapTextVocab.js";

const QUEUE_KEY = "parseTextWorkerQueue";

async function consume() {
    const connection = await amqp.connect(process.env.RABBITMQ_CONNECTION_URL!);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_KEY, {
        durable: true,
        maxPriority: 2
    });
    await channel.prefetch(10);
    console.log(`Text parser worker listening on ${QUEUE_KEY}...`);

    await channel.consume(QUEUE_KEY, async (msg) => {
        if (!msg)
            return;
        const args: { textId: number } = JSON.parse(msg.content.toString());
        console.log(`Received request to parse text(id=${args.textId})`);

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
                parsedContent: null,
                parsedTitle: null,
                isProcessing: true
            });

            const parser = getParser(text.language.code);
            const textParsedTitle = parser.parseText(text.title);
            const textParsedContent = parser.parseText(text.content);
            const textWords: string[] = [
                ...parser.splitWords(textParsedTitle, {keepDuplicates: false}),
                ...parser.splitWords(textParsedContent, {keepDuplicates: false})
            ];
            textWords.sort();   //important to avoid deadlocks

            await em.nativeDelete(MapTextVocab, {text: text.id, vocab: {text: {$nin: textWords}}});
            await tm.upsertMany(Vocab, textWords.map(word => ({text: word, language: text.language.id})));

            const textVocabs = await tm.createQueryBuilder(Vocab).select("*").where({language: text.language}).andWhere(`? LIKE '% ' || text || ' %'`, [` ${textParsedTitle} ${textParsedContent} `]).orderBy({id: QueryOrder.ASC});
            await tm.upsertMany(MapTextVocab, textVocabs.map(vocab => ({text: text.id, vocab: vocab.id})));

            await tm.nativeUpdate(Text, {id: text.id}, {
                parsedContent: textParsedContent,
                parsedTitle: textParsedTitle,
                isProcessing: false
            });
        }).then(() => {
            console.log(`Text(id=${args.textId}) parsed successfully`);
            orm.close().then(() => channel.ack(msg));
        }).catch((e) => {
            console.log(`Text(id=${args.textId}) parsing failed`);
            console.error(e);
            orm.close().then(() => channel.nack(msg));
        });
    });
}


consume().catch(console.error);
