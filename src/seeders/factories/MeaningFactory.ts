import {CustomFactory} from "@/src/seeders/factories/CustomFactory.js";
import {EntityData} from "@mikro-orm/core";
import {Faker} from "@mikro-orm/seeder";
import {Meaning} from "@/src/models/entities/Meaning.js";

export class MeaningFactory extends CustomFactory<Meaning> {
    readonly model = Meaning;

    protected definition(faker: Faker): EntityData<Meaning> {
        return {
            text:faker.random.alpha({count:20})
        };
    }


}