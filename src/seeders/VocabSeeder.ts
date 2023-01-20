import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {VocabFactory} from "@/src/seeders/factories/VocabFactory.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {syncIdSequence} from "@/src/seeders/utils.js";

export class VocabSeeder extends Seeder {
    static readonly FILE_NAME = "vocabs.json";

    async run(em: EntityManager, context: Dictionary): Promise<void> {
        if (!await fs.exists(`data/${VocabSeeder.FILE_NAME}`))
            return;
        const vocabs = await fs.readJSON(`data/${VocabSeeder.FILE_NAME}`)
        const vocabFactory = new VocabFactory(em)

        process.stdout.write("seeding vocabs...");
        vocabs.forEach((vocabData: EntityData<Vocab>) => {
            em.persist(vocabFactory.makeEntity({
                id: vocabData.id,
                text: vocabData.text,
                language: vocabData.language,
                isPhrase: vocabData.isPhrase,
                learners: vocabData.learners
            }))
        })
        await em.flush();
        await syncIdSequence(em, "vocab")
        console.log("done");
    }
}