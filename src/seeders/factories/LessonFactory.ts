import {Faker} from "@mikro-orm/seeder";
import {EntityData} from "@mikro-orm/core";
import {CustomFactory} from "@/src/seeders/factories/CustomFactory.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {parsers} from "dzelda-common";

export class LessonFactory extends CustomFactory<Lesson> {
    readonly model = Lesson;

    protected definition(faker: Faker): EntityData<Lesson> {
        const title = faker.random.words(faker.datatype.number({min: 4, max: 10}));
        const text = faker.random.words(faker.datatype.number({min: 50, max: 100}));
        return {
            title: title,
            text: text,
            parsedTitle: parsers["en"].parseText(title),
            parsedText: parsers["en"].parseText(text),
            image: faker.image.imageUrl(100, 100),
            addedOn: new Date(Math.round(Date.now() / 1000) * 1000), // now rounded to nearest second because db column is timestampz(0)
            audio: "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg",
            pastViewersCount: 0,
            orderInCourse: 0,
            isLastInCourse: true
        };
    }

    override makeDefinition(overrideParameters?: EntityData<Lesson>): EntityData<Lesson> {
        if (overrideParameters?.pastViewers !== undefined && overrideParameters?.pastViewersCount === undefined)
            overrideParameters.pastViewersCount = Array.isArray(overrideParameters?.pastViewers) ? overrideParameters.pastViewers.length : 1;
        return super.makeDefinition(overrideParameters);
    }
}
