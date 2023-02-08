import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {VocabFactory} from "@/src/seeders/factories/VocabFactory.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {syncIdSequence} from "@/src/seeders/utils.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";

export class VocabSeeder extends Seeder {
    static readonly VOCABS_FILE_NAME = "vocabs.json";
    static readonly MAP_LEARNER_VOCABS_FILE_NAME = "map_learner_vocabs.json";

    async run(em: EntityManager, context: Dictionary): Promise<void> {
        if (!await fs.exists(`data/${VocabSeeder.VOCABS_FILE_NAME}`) || !await fs.exists(`data/${VocabSeeder.MAP_LEARNER_VOCABS_FILE_NAME}`))
            return;
        const vocabs: EntityData<Vocab>[] = await fs.readJSON(`data/${VocabSeeder.VOCABS_FILE_NAME}`)
        const vocabFactory = new VocabFactory(em)

        process.stdout.write("seeding vocabs...");
        vocabs.forEach((vocabData) => {
            em.persist(vocabFactory.makeEntity({
                id: vocabData.id,
                text: vocabData.text,
                language: vocabData.language,
                isPhrase: vocabData.isPhrase,
                learners: []
            }))
        })
        await em.flush();
        await syncIdSequence(em, "vocab")

        const learnerMappings: EntityData<MapLearnerVocab>[] = await fs.readJSON(`data/${VocabSeeder.MAP_LEARNER_VOCABS_FILE_NAME}`)
        await em.insertMany(MapLearnerVocab, learnerMappings.map((mappingData) => ({
            learner: mappingData.learner,
            vocab: mappingData.vocab,
            level: mappingData.level,
            notes: mappingData.notes
        })));
        console.log("done");
    }
}