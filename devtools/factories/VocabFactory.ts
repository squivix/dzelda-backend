import {CustomFactory} from "@/devtools/factories/CustomFactory.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {EntityData} from "@mikro-orm/core";
import {faker} from "@faker-js/faker";

export class VocabFactory extends CustomFactory<Vocab> {
    readonly model = Vocab;

    protected definition(): EntityData<Vocab> {
        return {
            text: faker.random.alpha(20),
            isPhrase: faker.datatype.boolean(),
            learnersCount: 0,
            textsCount: 0,
            vocabVariants: [],
        };
    }

    override makeDefinition(overrideParameters?: EntityData<Vocab>): EntityData<Vocab> {
        if (overrideParameters?.textsAppearingIn !== undefined)
            overrideParameters.textsCount = Array.isArray(overrideParameters?.textsAppearingIn) ? overrideParameters.textsAppearingIn.length : 1;
        if (overrideParameters?.learners !== undefined && overrideParameters.learnersCount === undefined)
            overrideParameters.learnersCount = Array.isArray(overrideParameters?.learners) ? overrideParameters.learners.length : 1;
        return super.makeDefinition(overrideParameters);
    }
}
