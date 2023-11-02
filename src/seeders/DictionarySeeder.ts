import {Dictionary as MikroORMDictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {batchSeed, syncIdSequence} from "@/src/seeders/utils.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {MapLearnerDictionary} from "@/src/models/entities/MapLearnerDictionary.js";

export class DictionarySeeder extends Seeder {
    static readonly FILE_NAME = "dictionaries.jsonl";

    async run(em: EntityManager, context: MikroORMDictionary): Promise<void> {
        const dictionariesFilePath = `${context.databaseDumpPath}/${DictionarySeeder.FILE_NAME}`;

        if (!await fs.exists(dictionariesFilePath)) {
            console.error(`${dictionariesFilePath} not found`);
            return;
        }

        await batchSeed({
            filePath: dictionariesFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertBatch(em, batch as (EntityData<Dictionary> & { learners: EntityData<Profile>[] })[]),
            postSeed: async () => await syncIdSequence(em, "dictionary"),
            resourceName: "dictionary",
        });
    }

    private async insertBatch(em: EntityManager, batch: (EntityData<Dictionary> & { learners: EntityData<Profile>[] })[]) {
        const learnerMappings: EntityData<MapLearnerDictionary>[] = [];
        await em.insertMany(Dictionary, batch.map(dictionaryData => {
            learnerMappings.push(...dictionaryData.learners.map(learner => ({learner, dictionary: dictionaryData.id})))
            return {
                id: dictionaryData.id,
                language: dictionaryData.language,
                name: dictionaryData.name,
                lookupLink: dictionaryData.lookupLink,
                dictionaryLink: dictionaryData.dictionaryLink,
                isDefault: dictionaryData.isDefault,
            };
        }));
        await em.insertMany(MapLearnerDictionary, learnerMappings)
    }
}
