import {Faker} from "@mikro-orm/seeder";
import {EntityData} from "@mikro-orm/core";
import {CustomFactory} from "@/src/seeders/factories/CustomFactory.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";

export class DictionaryFactory extends CustomFactory<Dictionary> {
    readonly model = Dictionary;

    protected definition(faker: Faker): EntityData<Dictionary> {
        return {}
    }
}