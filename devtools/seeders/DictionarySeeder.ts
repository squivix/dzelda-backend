import {Dictionary as MikroORMDictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {batchSeed, syncIdSequence} from "@/devtools/seeders/utils.js";
import {MapLearnerDictionary} from "@/src/models/entities/MapLearnerDictionary.js";
import path from "path";
import {DATASET_FILES} from "@/devtools/constants.js";

export class DictionarySeeder extends Seeder {

    async run(em: EntityManager, context: MikroORMDictionary): Promise<void> {
        const dictionariesFilePath = path.join(context.databaseDumpPath, DATASET_FILES.dictionary);
        const mapLearnerDictionaryFilePath = path.join(context.databaseDumpPath, DATASET_FILES.mapLearnerDictionary);

        if (!await fs.exists(dictionariesFilePath)) {
            console.error(`${dictionariesFilePath} not found`);
            return;
        }

        await batchSeed({
            filePath: dictionariesFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertDictionaryBatch(em, batch as EntityData<Dictionary>[]),
            postSeed: async () => await syncIdSequence(em, "dictionary"),
            resourceName: "dictionary",
        });

        if (!await fs.exists(mapLearnerDictionaryFilePath)) {
            console.error(`${mapLearnerDictionaryFilePath} not found`);
            return;
        }
        await batchSeed({
            filePath: mapLearnerDictionaryFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertMapLearnerDictionaryBatch(em, batch as EntityData<MapLearnerDictionary>[]),
            postSeed: async () => await syncIdSequence(em, "map_learner_dictionary"),
            resourceName: "learner-dictionary mapping",
        });
    }

    private async insertDictionaryBatch(em: EntityManager, batch: EntityData<Dictionary>[]) {
        await em.insertMany(Dictionary, batch.map(dictionaryData => {
            return {
                id: dictionaryData.id,
                language: dictionaryData.language,
                name: dictionaryData.name,
                lookupLink: dictionaryData.lookupLink,
                dictionaryLink: dictionaryData.dictionaryLink,
                isDefault: dictionaryData.isDefault,
            };
        }));
    }

    private async insertMapLearnerDictionaryBatch(em: EntityManager, batch: EntityData<MapLearnerDictionary>[]) {
        await em.insertMany(MapLearnerDictionary, batch.map((mappingData) => ({
            learner: mappingData.learner,
            dictionary: mappingData.dictionary,
        })));
    }
}
