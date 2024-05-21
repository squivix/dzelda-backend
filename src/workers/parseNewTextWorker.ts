import amqp from "amqplib";
import {MikroORM, SqlEntityManager} from "@mikro-orm/postgresql";
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
        durable: true
    });
    await channel.prefetch(1);
    console.log(`Text parser worker listening on ${QUEUE_KEY}...`);

    await channel.consume(QUEUE_KEY, async (msg) => {
        if (!msg)
            return;
        const args: { textId: number, doClearPastParsing?: boolean } = JSON.parse(msg.content.toString());
        console.log(`Received request to parse text(id=${args.textId})`);

        const orm = await MikroORM.init(options);
        const em = orm.em.fork() as SqlEntityManager;
        const text = await em.findOne(Text, {id: args.textId}, {populate: ["language"], fields: ["*", "language.code", "language.id"]});
        if (!text) {
            console.log(`Text (id=${args.textId}) not found`);
            channel.ack(msg);
            return;
        }

        await em.transactional(async (tm) => {
            const parser = getParser(text.language.code);
            const textParsedTitle = parser.parseText(text.title);
            const textParsedContent = parser.parseText(text.content);
            const textWords: string[] = [
                ...parser.splitWords(textParsedTitle, {keepDuplicates: false}),
                ...parser.splitWords(textParsedContent, {keepDuplicates: false})
            ];

            if (args.doClearPastParsing)
                await tm.nativeDelete(MapTextVocab, {text: text.id, vocab: {text: {$nin: textWords}}});

            await tm.upsertMany(Vocab, textWords.map(word => ({text: word, language: text.language.id})));
            const textVocabs = await tm.createQueryBuilder(Vocab).select("*").where({language: text.language}).andWhere(`? LIKE '% ' || text || ' %'`, [` ${textParsedTitle} ${textParsedContent} `]);
            await tm.insertMany(MapTextVocab, textVocabs.map(vocab => ({text: text.id, vocab: vocab.id})));
            await tm.nativeUpdate(Text, {id: text.id}, {
                parsedContent: textParsedContent,
                parsedTitle: textParsedTitle,
                isProcessing: false
            });
        }).then(() => {
            channel.ack(msg);
            console.log(`Text(id=${args.textId}) parsed successfully`);
        }).catch((e) => {
            console.log(`Text(id=${args.textId}) parsing failed`);
            console.error(e);
            channel.nack(msg);
        });
    });
}


consume().catch(console.error);
