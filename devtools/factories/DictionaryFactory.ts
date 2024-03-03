import {EntityData} from "@mikro-orm/core";
import {CustomFactory} from "@/devtools/factories/CustomFactory.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {faker} from "@faker-js/faker";

export class DictionaryFactory extends CustomFactory<Dictionary> {
    readonly model = Dictionary;

    protected definition(): EntityData<Dictionary> {
        return {
            name: faker.random.alpha(20),
            lookupLink: faker.internet.url(),
            dictionaryLink:faker.internet.url()
        };
    }
}
