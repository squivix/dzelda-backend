import {EntityManager} from "@mikro-orm/core";
import {batchDump} from "@/devtools/dumpers/utils.js";
import path from "path";
import {Language} from "@/src/models/entities/Language.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {DATASET_FILES} from "@/devtools/constants.js";

export async function dumpLanguages({em, batchSize, dataPath}: { em: EntityManager, batchSize: number, dataPath: string }) {
    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_FILES.language),
        resourceName: "language",
        entityClass: Language,
        writeEntity: (language: Language) => ({
            id: language.id,
            name: language.name,
            greeting: language.greeting,
            code: language.code,
            flagCircular: language.flagCircular,
            flagEmoji: language.flagEmoji,
            secondSpeakersCount: language.secondSpeakersCount,
        })
    });

    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_FILES.mapLearnerLanguage),
        resourceName: "learner-language mappings",
        entityClass: MapLearnerLanguage,
        writeEntity: (mapping: MapLearnerLanguage) => ({
            learner: mapping.learner.id,
            language: mapping.language.id,
        })
    });
}
