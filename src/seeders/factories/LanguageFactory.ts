import {Factory, Faker} from "@mikro-orm/seeder";
import {EntityData} from "@mikro-orm/core";
import {Language} from "@/src/models/entities/Language.js";
import {CustomFactory} from "@/src/seeders/factories/CustomFactory.js";

export class LanguageFactory extends CustomFactory<Language> {
    readonly model = Language;

    protected definition(faker: Faker): EntityData<Language> {
        return {
            code: faker.random.alpha({count: 4}),
            name: faker.random.word(),
            greeting: faker.random.words(20),
            flag: faker.image.imageUrl(100, 100),
            flagCircular: faker.image.imageUrl(100, 100),
            flagEmoji: faker.internet.emoji(),
            isSupported: faker.datatype.boolean(),
            levelThresholds: {
                beginner1: 0,
                beginner2: faker.datatype.number({min: 500, max: 1500}),
                intermediate1: faker.datatype.number({min: 2500, max: 7500}),
                intermediate2: faker.datatype.number({min: 8000, max: 15000}),
                advanced1: faker.datatype.number({min: 16000, max: 25000}),
                advanced2: faker.datatype.number({min: 26000, max: 35000}),
            }
        };
    }

}