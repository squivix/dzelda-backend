import {Dictionary, EntityData, EntityManager, RequiredEntityData} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {Language} from "@/src/models/entities/Language.js";
import {batchSeed, syncIdSequence} from "@/devtools/seeders/utils.js";
import path from "path";
import {DATASET_FILES} from "@/devtools/constants.js";
import {TranslationLanguage} from "@/src/models/entities/TranslationLanguage.js";

export class LanguageSeeder extends Seeder {

    async run(em: EntityManager, context: Dictionary): Promise<void> {
        const learningLanguagesFilePath = path.join(context.databaseDumpPath, DATASET_FILES.language);
        const translationLanguagesFilePath = path.join(context.databaseDumpPath, DATASET_FILES.translationLanguage);

        if (!await fs.exists(learningLanguagesFilePath)) {
            console.error(`${learningLanguagesFilePath} not found`);
            return;
        }

        await batchSeed({
            filePath: learningLanguagesFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertLearningLanguageBatch(em, batch),
            postSeed: async () => await syncIdSequence(em, "language"),
            resourceName: "learning-language",
        });

        if (!await fs.exists(translationLanguagesFilePath)) {
            console.error(`${translationLanguagesFilePath} not found`);
            return;
        }

        await batchSeed({
            filePath: translationLanguagesFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertTranslationLanguageBatch(em, batch),
            postSeed: async () => await syncIdSequence(em, "translation_language"),
            resourceName: "translation-language",
        });
    }

    private async insertLearningLanguageBatch(em: EntityManager, batch: EntityData<Language>[]) {
        await em.insertMany(Language, batch.map(languageData => ({
            id: languageData.id,
            name: languageData.name,
            greeting: languageData.greeting,
            code: languageData.code,
            flagCircular: languageData.flagCircular,
            flag: languageData.flag,
            flagEmoji: languageData.flagEmoji,
            color: languageData.color,
            secondSpeakersCount: languageData.secondSpeakersCount,
        } as RequiredEntityData<Language>)));
    }

    private async insertTranslationLanguageBatch(em: EntityManager, batch: EntityData<TranslationLanguage>[]) {
        await em.insertMany(TranslationLanguage, batch.map(languageData => ({
            id: languageData.id,
            name: languageData.name,
            code: languageData.code,
            isDefault: languageData.isDefault??false,
        } as RequiredEntityData<TranslationLanguage>)));
    }
}

