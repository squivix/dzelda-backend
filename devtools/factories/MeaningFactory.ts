import {CustomFactory} from "@/devtools/factories/CustomFactory.js";
import {EntityData} from "@mikro-orm/core";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {faker} from "@faker-js/faker";

export class MeaningFactory extends CustomFactory<Meaning> {
    readonly model = Meaning;

    protected definition(): EntityData<Meaning> {
        return {
            text: faker.random.alpha({count: 20}),
            learners: [],
            attribution: null,
            learnersCount: 0
        };
    }

    override makeDefinition(overrideParameters?: EntityData<Meaning>): EntityData<Meaning> {
        if (overrideParameters?.learners !== undefined)
            overrideParameters.learnersCount = Array.isArray(overrideParameters?.learners) ? overrideParameters.learners.length : 1;
        return super.makeDefinition(overrideParameters);
    }

}
