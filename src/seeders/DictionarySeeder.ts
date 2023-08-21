import {Dictionary as MikroORMDictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {DictionaryFactory} from "@/src/seeders/factories/DictionaryFactory.js";
import {batchSeed, syncIdSequence} from "@/src/seeders/utils.js";

export class DictionarySeeder extends Seeder {
    static readonly FILE_NAME = "dictionaries.jsonl";

    async run(em: EntityManager, context: MikroORMDictionary): Promise<void> {
        const dictionariesFilePath = `${context.datasetPath}/${DictionarySeeder.FILE_NAME}`;

        if (!await fs.exists(dictionariesFilePath)) {
            console.log(`${dictionariesFilePath} not found`);
            return;
        }

        await batchSeed({
            filePath: dictionariesFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertBatch(em, batch),
            postSeed: async () => await syncIdSequence(em, "dictionary"),
            resourceName: "dictionary",
        });
    }

    private async insertBatch(em: EntityManager, batch: EntityData<Dictionary>[]) {
        const dictionaryFactory = new DictionaryFactory(em);
        const entities = batch.map(dictionaryData => dictionaryFactory.makeEntity({
            id: dictionaryData.id,
            language: dictionaryData.language,
            name: dictionaryData.name,
            lookupLink: dictionaryData.lookupLink,
            dictionaryLink: dictionaryData.dictionaryLink,
            isDefault: dictionaryData.isDefault,
            learners: dictionaryData.learners
        }));
        await em.persistAndFlush(entities);
    }
}
