import {Dictionary as MikroORMDictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {DictionaryFactory} from "@/src/seeders/factories/DictionaryFactory.js";
import {syncIdSequence} from "@/src/seeders/utils.js";

export class DictionarySeeder extends Seeder {
    static readonly FILE_NAME = "dictionaries.json";

    async run(em: EntityManager, context: MikroORMDictionary): Promise<void> {
        if (!await fs.exists(`data/${DictionarySeeder.FILE_NAME}`))
            return;
        const dictionaries = await fs.readJSON(`data/${DictionarySeeder.FILE_NAME}`)
        const dictionaryFactory = new DictionaryFactory(em)

        process.stdout.write("seeding dictionaries...");
        dictionaries.forEach((dictionaryData: EntityData<Dictionary>) => {
            em.persist(dictionaryFactory.makeEntity({
                id: dictionaryData.id,
                language: dictionaryData.language,
                name: dictionaryData.name,
                lookupLink: dictionaryData.lookupLink,
                dictionaryLink: dictionaryData.dictionaryLink,
                isDefault: dictionaryData.isDefault,
                learners: dictionaryData.learners
            }))
        })
        await em.flush();
        await syncIdSequence(em, "dictionary")
        console.log("done");
    }
}