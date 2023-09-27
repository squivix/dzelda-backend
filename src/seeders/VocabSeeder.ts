import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {batchSeed, syncIdSequence} from "@/src/seeders/utils.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";

export class VocabSeeder extends Seeder {
    static readonly VOCABS_FILE_NAME = "vocabs.jsonl";
    static readonly MAP_LEARNER_VOCABS_FILE_NAME = "map_learner_vocabs.jsonl";

    async run(em: EntityManager, context: Dictionary): Promise<void> {
        const vocabsFilePath = `${context.databaseDumpPath}/${VocabSeeder.VOCABS_FILE_NAME}`;
        const mapLearnerVocabsFilePath = `${context.databaseDumpPath}/${VocabSeeder.MAP_LEARNER_VOCABS_FILE_NAME}`;

        if (!await fs.exists(vocabsFilePath)) {
            console.error(`${vocabsFilePath} not found`);
            return;
        }
        if (!await fs.exists(mapLearnerVocabsFilePath)) {
            console.error(`${mapLearnerVocabsFilePath} not found`);
            return;
        }

        await batchSeed({
            filePath: vocabsFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertVocabsBatch(em, batch),
            postSeed: async () => await syncIdSequence(em, "vocab"),
            resourceName: "vocab",
        });

        await batchSeed({
            filePath: mapLearnerVocabsFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertMapLearnerVocabsBatch(em, batch),
            postSeed: async () => await syncIdSequence(em, "map_learner_vocab"),
            resourceName: "learner-vocab mapping",
        });
    }

    private async insertVocabsBatch(em: EntityManager, batch: EntityData<Vocab>[]) {
        await em.insertMany(Vocab, batch.map(vocabData => ({
            id: vocabData.id,
            text: vocabData.text,
            language: vocabData.language,
            isPhrase: vocabData.isPhrase,
        })));
    }

    private async insertMapLearnerVocabsBatch(em: EntityManager, batch: EntityData<MapLearnerVocab>[]) {
        await em.insertMany(MapLearnerVocab, batch.map((mappingData) => ({
            learner: mappingData.learner,
            vocab: mappingData.vocab,
            level: mappingData.level,
            notes: mappingData.notes
        })));
    }
}
