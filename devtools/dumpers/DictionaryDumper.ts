import {EntityManager} from "@mikro-orm/core";
import {batchDump} from "@/devtools/dumpers/utils.js";
import path from "path";
import {DATASET_COURSE_FILE_NAME, DATASET_DICTIONARY_FILE_NAME, DATASET_MAP_LEARNER_DICTIONARY_FILE_NAME} from "@/devtools/constants.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {MapLearnerDictionary} from "@/src/models/entities/MapLearnerDictionary.js";

export async function dumpDictionaries({em, batchSize, dataPath}: { em: EntityManager, batchSize: number, dataPath: string }) {
    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_DICTIONARY_FILE_NAME),
        resourceName: "dictionary",
        entityClass: Dictionary,
        writeEntity: (dictionary: Dictionary) => ({
            id: dictionary.id,
            language: dictionary.language.id,
            name: dictionary.name,
            lookupLink: dictionary.lookupLink,
            dictionaryLink: dictionary.dictionaryLink,
            isDefault: dictionary.isDefault,
        })
    })

    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_MAP_LEARNER_DICTIONARY_FILE_NAME),
        resourceName: "learner-dictionary mappings",
        entityClass: MapLearnerDictionary,
        writeEntity: (mapping: MapLearnerDictionary) => ({
            learner: mapping.learner.id,
            dictionary: mapping.dictionary.id,
        })
    })
}
