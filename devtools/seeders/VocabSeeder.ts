import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {batchSeed, syncIdSequence} from "@/devtools/seeders/utils.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {DATASET_MAP_LEARNER_VOCABS_FILE_NAME, DATASET_VOCAB_FILE_NAME} from "@/devtools/constants.js";
import path from "path";

export class VocabSeeder extends Seeder {
    async run(em: EntityManager, context: Dictionary): Promise<void> {
        const vocabsFilePath = path.join(context.databaseDumpPath, DATASET_VOCAB_FILE_NAME);
        const mapLearnerVocabsFilePath = path.join(context.databaseDumpPath, DATASET_MAP_LEARNER_VOCABS_FILE_NAME);

        if (!await fs.exists(vocabsFilePath)) {
            console.error(`${vocabsFilePath} not found`);
            return;
        }

        await batchSeed({
            filePath: vocabsFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertVocabsBatch(em, batch),
            postSeed: async () => await syncIdSequence(em, "vocab"),
            resourceName: "vocab",
        });

        if (!await fs.exists(mapLearnerVocabsFilePath)) {
            console.error(`${mapLearnerVocabsFilePath} not found`);
            return;
        }
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
            notes: mappingData.notes,
            savedOn: mappingData.savedOn
        })));
    }
}
