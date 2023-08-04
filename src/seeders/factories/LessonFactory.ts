import {Faker} from "@mikro-orm/seeder";
import {EntityData} from "@mikro-orm/core";
import {CustomFactory} from "@/src/seeders/factories/CustomFactory.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {randomEnum} from "@/tests/utils.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";

export class LessonFactory extends CustomFactory<Lesson> {
    readonly model = Lesson;

    protected definition(faker: Faker): EntityData<Lesson> {
        return {
            title: faker.random.words(faker.datatype.number({min: 4, max: 10})),
            text: faker.random.words(faker.datatype.number({min: 50, max: 100})),
            image: faker.image.imageUrl(100, 100),
            level: randomEnum(LanguageLevel),
            addedOn: new Date(Math.round(Date.now() / 1000) * 1000), // now rounded to nearest second because db column is timestampz(0)
            audio: "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg",
            learnersCount: 0
        };
    }

    override makeDefinition(overrideParameters?: EntityData<Lesson>): EntityData<Lesson> {
        if (overrideParameters?.learners !== undefined)
            overrideParameters.learnersCount = Array.isArray(overrideParameters?.learners) ? overrideParameters.learners.length : 1;
        return super.makeDefinition(overrideParameters);
    }
}
