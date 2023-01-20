import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {LanguageFactory} from "@/src/seeders/factories/LanguageFactory.js";
import {Language} from "@/src/models/entities/Language.js";

export class LanguageSeeder extends Seeder {
    static readonly FILE_NAME = "languages.json";

    async run(em: EntityManager, context: Dictionary): Promise<void> {
        if (!await fs.exists(`data/${LanguageSeeder.FILE_NAME}`))
            return;
        const languages = await fs.readJSON(`data/${LanguageSeeder.FILE_NAME}`)
        const languageFactory = new LanguageFactory(em)

        process.stdout.write("seeding languages...");
        languages.forEach((languageData: EntityData<Language>) => {
            em.persist(languageFactory.makeEntity({
                id: languageData.id,
                name: languageData.name,
                greeting: languageData.greeting,
                code: languageData.code,
                flagCircular: languageData.flagCircular,
                flag: languageData.flag,
                flagEmoji: languageData.flagEmoji,
                isSupported: languageData.isSupported,
                learners:languageData.learners
            }))
        })
        await em.flush();
        console.log("done");
    }
}