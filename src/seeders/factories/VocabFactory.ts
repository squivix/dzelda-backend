import {CustomFactory} from "@/src/seeders/factories/CustomFactory.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {EntityData} from "@mikro-orm/core";
import {Faker} from "@mikro-orm/seeder";

export class VocabFactory extends CustomFactory<Vocab> {
    readonly model = Vocab;

    protected definition(faker: Faker): EntityData<Vocab> {
        return {
            text: faker.random.alpha(20),
            isPhrase: faker.datatype.boolean()
        };
    }


}