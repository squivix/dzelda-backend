import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {VocabFactory} from "@/src/seeders/factories/VocabFactory.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {batchSeed, syncIdSequence} from "@/src/seeders/utils.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {LessonFactory} from "@/src/seeders/factories/LessonFactory.js";
import {countFileLines} from "@/src/utils/utils.js";
import * as cliProgress from "cli-progress";
import {open} from "node:fs/promises";
import {Course} from "@/src/models/entities/Course.js";

export class VocabSeeder extends Seeder {
    static readonly VOCABS_FILE_NAME = "vocabs.jsonl";
    static readonly MAP_LEARNER_VOCABS_FILE_NAME = "map_learner_vocabs.jsonl";

    async run(em: EntityManager, context: Dictionary): Promise<void> {
        const vocabsFilePath = `${context.datasetPath}/${VocabSeeder.VOCABS_FILE_NAME}`;
        const mapLearnerVocabsFilePath = `${context.datasetPath}/${VocabSeeder.MAP_LEARNER_VOCABS_FILE_NAME}`;

        if (!await fs.exists(vocabsFilePath)) {
            console.log(`${vocabsFilePath} not found`);
            return;
        }
        if (!await fs.exists(mapLearnerVocabsFilePath)) {
            console.log(`${mapLearnerVocabsFilePath} not found`);
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
        const vocabFactory = new VocabFactory(em);
        const entities = batch.map(vocabData => vocabFactory.makeEntity({
            id: vocabData.id,
            text: vocabData.text,
            language: vocabData.language,
            isPhrase: vocabData.isPhrase,
            learners: []
        }));
        await em.persistAndFlush(entities);
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
