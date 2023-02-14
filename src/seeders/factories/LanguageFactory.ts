import {Faker} from "@mikro-orm/seeder";
import {EntityData, EntityManager, UniqueConstraintViolationException} from "@mikro-orm/core";
import {Language} from "@/src/models/entities/Language.js";
import {CustomFactory} from "@/src/seeders/factories/CustomFactory.js";

export class LanguageFactory extends CustomFactory<Language> {
    readonly model = Language;

    public static makeDefinition(faker: Faker): EntityData<Language> {
        return {
            code: faker.random.alpha({count: 4}),
            name: faker.random.word(),
            greeting: faker.random.words(20),
            flag: faker.image.imageUrl(100, 100),
            flagCircular: faker.image.imageUrl(100, 100),
            flagEmoji: faker.internet.emoji(),
            isSupported: true,
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

    async createOne(overrideParameters?: EntityData<Language>): Promise<Language> {
        const em = (this as any).em as EntityManager;
        const language = this.makeEntity(overrideParameters);
        await em.upsert(Language, language);
        await em.flush();
        return language;
    }

    protected definition(faker: Faker): EntityData<Language> {
        return LanguageFactory.makeDefinition(faker);
    }
}