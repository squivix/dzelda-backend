import {EntityData} from "@mikro-orm/core";
import {CustomFactory} from "@/devtools/factories/CustomFactory.js";
import {faker} from "@faker-js/faker";
import {TranslationLanguage} from "@/src/models/entities/TranslationLanguage.js";

export class TranslationLanguageFactory extends CustomFactory<TranslationLanguage> {
    readonly model = TranslationLanguage;

    protected definition(): EntityData<TranslationLanguage> {
        return {
            code: faker.random.alpha({count: 20}),
            name: faker.random.word(),
        };
    }

}
