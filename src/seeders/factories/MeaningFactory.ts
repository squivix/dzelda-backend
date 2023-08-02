import {CustomFactory} from "@/src/seeders/factories/CustomFactory.js";
import {EntityData} from "@mikro-orm/core";
import {Faker} from "@mikro-orm/seeder";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {Language} from "@/src/models/entities/Language.js";

export class MeaningFactory extends CustomFactory<Meaning> {
    readonly model = Meaning;

    protected definition(faker: Faker): EntityData<Meaning> {
        return {
            text: faker.random.alpha({count: 20}),
            learners: [],
            learnersCount: 0
        };
    }

    override makeDefinition(overrideParameters?: EntityData<Language>): EntityData<Language> {
        if (overrideParameters?.learners !== undefined)
            overrideParameters.learnersCount = Array.isArray(overrideParameters?.learners) ? overrideParameters.learners.length : 1;
        return super.makeDefinition(overrideParameters);
    }

}
