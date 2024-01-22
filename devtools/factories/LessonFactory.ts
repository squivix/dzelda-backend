import {Faker} from "@mikro-orm/seeder";
import {EntityData, EntityManager} from "@mikro-orm/core";
import {CustomFactory} from "@/devtools/factories/CustomFactory.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {parsers} from "dzelda-common";
import {ProfileFactory} from "@/devtools/factories/ProfileFactory.js";
import {UserFactory} from "@/devtools/factories/UserFactory.js";
import {randomEnum} from "@/tests/utils.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";

export class LessonFactory extends CustomFactory<Lesson> {
    readonly model = Lesson;

    protected definition(faker: Faker): EntityData<Lesson> {
        const title = faker.random.words(faker.datatype.number({min: 4, max: 10}));
        const text = faker.random.words(faker.datatype.number({min: 50, max: 100}));
        const em = (this as any).em as EntityManager;
        const userFactory = new UserFactory(em);
        const profileFactory = new ProfileFactory(em);
        return {
            title: title,
            text: text,
            parsedTitle: parsers["en"].parseText(title),
            parsedText: parsers["en"].parseText(text),
            isPublic: true,
            level: randomEnum(LanguageLevel),
            image: faker.image.imageUrl(100, 100),
            addedOn: new Date(Math.round(Date.now() / 1000) * 1000), // now rounded to nearest second because db column is timestampz(0)
            audio: "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg",
            addedBy: profileFactory.makeDefinition({user: userFactory.makeDefinition({}, ["profile"])}),
            pastViewersCount: 0,
        };
    }

    override makeDefinition(overrideParameters?: EntityData<Lesson>): EntityData<Lesson> {
        if (overrideParameters?.pastViewers !== undefined && overrideParameters?.pastViewersCount === undefined)
            overrideParameters.pastViewersCount = Array.isArray(overrideParameters?.pastViewers) ? overrideParameters.pastViewers.length : 1;
        return super.makeDefinition(overrideParameters);
    }

    override makeDefinitions(amount: number, overrideParameters?: EntityData<Lesson>): EntityData<Lesson>[] {
        let overrideArray: EntityData<Lesson>[] = [...Array(amount)].map(_ => ({...overrideParameters}));
        if (overrideParameters?.orderInCourse === undefined)
            overrideArray = overrideArray.map((p, i) => ({...p, orderInCourse: i}));
        if (overrideParameters?.isLastInCourse === undefined)
            overrideArray = overrideArray.map((p, i) => ({...p, isLastInCourse: i == amount - 1}));
        return overrideArray.map((p) => this.makeDefinition(p));
    }
}
