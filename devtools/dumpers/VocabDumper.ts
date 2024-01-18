import {EntityManager} from "@mikro-orm/core";
import {batchDump} from "@/devtools/dumpers/utils.js";
import path from "path";
import {DATASET_MAP_LEARNER_VOCABS_FILE_NAME, DATASET_VOCAB_FILE_NAME} from "@/devtools/constants.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";

export async function dumpVocabs({em, batchSize, dataPath}: { em: EntityManager, batchSize: number, dataPath: string }) {
    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_VOCAB_FILE_NAME),
        entityClass: Vocab,
        resourceName: "vocab",
        writeEntity: (vocab: Vocab) => ({
            id: vocab.id,
            text: vocab.text,
            language: vocab.language.id,
            isPhrase: vocab.isPhrase,
        })
    })

    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_MAP_LEARNER_VOCABS_FILE_NAME),
        entityClass: MapLearnerVocab,
        resourceName: "learner-vocab mappings",
        writeEntity: (mapping: MapLearnerVocab) => ({
            learner: mapping.learner.id,
            vocab: mapping.vocab.id,
            level: mapping.level,
            notes: mapping.notes,
            savedOn: mapping.savedOn
        })
    })
}