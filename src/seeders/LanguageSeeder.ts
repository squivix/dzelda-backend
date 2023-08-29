import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {Language} from "@/src/models/entities/Language.js";
import {batchSeed, syncIdSequence} from "@/src/seeders/utils.js";

export class LanguageSeeder extends Seeder {
    static readonly FILE_NAME = "languages.jsonl";

    async run(em: EntityManager, context: Dictionary): Promise<void> {
        const languagesFilePath = `${context.datasetPath}/${LanguageSeeder.FILE_NAME}`;

        if (!await fs.exists(languagesFilePath)) {
            console.error(`${languagesFilePath} not found`);
            return;
        }

        await batchSeed({
            filePath: languagesFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertBatch(em, batch),
            postSeed: async () => await syncIdSequence(em, "language"),
            resourceName: "language",
        });
    }

    private async insertBatch(em: EntityManager, batch: EntityData<Language>[]) {
        await em.insertMany(Language, batch.map(languageData => ({
            id: languageData.id,
            name: languageData.name,
            greeting: languageData.greeting,
            code: languageData.code,
            flagCircular: languageData.flagCircular,
            flag: languageData.flag,
            flagEmoji: languageData.flagEmoji,
            isSupported: languageData.isSupported
        })))
    }
}

