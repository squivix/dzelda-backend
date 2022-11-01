import {Factory, Faker} from "@mikro-orm/seeder";
import {Collection, EntityData, OneToMany, Property, types} from "@mikro-orm/core";
import {Language} from "../../models/entities/Language.js";
import {Course} from "../../models/entities/Course.js";

export class LanguageFactory extends Factory<Language> {
    readonly model = Language;

    protected definition(faker: Faker): EntityData<Language> {
        return {
            code: faker.random.locale().substring(0, 2),
            name: faker.random.word(),
            greeting: faker.random.words(20),
        };
    }

}