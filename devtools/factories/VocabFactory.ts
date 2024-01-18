import {CustomFactory} from "@/devtools/factories/CustomFactory.js";
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
        if (overrideParameters?.lessonsAppearingIn !== undefined)
            overrideParameters.lessonsCount = Array.isArray(overrideParameters?.lessonsAppearingIn) ? overrideParameters.lessonsAppearingIn.length : 1;
        if (overrideParameters?.learners !== undefined)
            overrideParameters.learnersCount = Array.isArray(overrideParameters?.learners) ? overrideParameters.learners.length : 1;
        return super.makeDefinition(overrideParameters);
    }
}
