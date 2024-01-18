import {EntityManager} from "@mikro-orm/core";
import {batchDump} from "@/devtools/dumpers/utils.js";
import path from "path";
import {DATASET_LANGUAGE_FILE_NAME, DATASET_MAP_LEARNER_LANGUAGE_FILE_NAME} from "@/devtools/constants.js";
import {Language} from "@/src/models/entities/Language.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";

export async function dumpLanguages({em, batchSize, dataPath}: { em: EntityManager, batchSize: number, dataPath: string }) {
    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_LANGUAGE_FILE_NAME),
        resourceName: "language",
        entityClass: Language,
        writeEntity: (language: Language) => ({
            id: language.id,
            name: language.name,
            greeting: language.greeting,
            code: language.code,
            flagCircular: language.flagCircular,
            flagEmoji: language.flagEmoji,
            isSupported: language.isSupported
        })
    })

    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_MAP_LEARNER_LANGUAGE_FILE_NAME),
        resourceName: "learner-language mappings",
        entityClass: MapLearnerLanguage,
        writeEntity: (mapping: MapLearnerLanguage) => ({
            learner: mapping.learner.id,
            language: mapping.language.id,
        })
    })
}