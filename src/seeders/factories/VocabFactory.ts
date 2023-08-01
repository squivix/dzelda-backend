import {CustomFactory} from "@/src/seeders/factories/CustomFactory.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {EntityData} from "@mikro-orm/core";
import {Faker} from "@mikro-orm/seeder";

export class VocabFactory extends CustomFactory<Vocab> {
    readonly model = Vocab;

    protected definition(faker: Faker): EntityData<Vocab> {
        return {
            text: faker.random.alpha(20),
            isPhrase: faker.datatype.boolean(),
            learnersCount: 0,
            lessonsCount: 0
        };
    }

    override makeDefinition(overrideParameters?: EntityData<Vocab>): EntityData<Vocab> {
        if (overrideParameters?.lessonsAppearingIn !== undefined && Array.isArray(overrideParameters?.lessonsAppearingIn))
            overrideParameters.lessonsCount = overrideParameters.lessonsAppearingIn.length;
        if (overrideParameters?.learners !== undefined && Array.isArray(overrideParameters?.learners))
            overrideParameters.learnersCount = overrideParameters.learners.length;
        return super.makeDefinition(overrideParameters);
    }
}
