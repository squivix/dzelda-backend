import {Faker} from "@mikro-orm/seeder";
import {EntityData, EntityManager} from "@mikro-orm/core";
import {CustomFactory} from "@/src/seeders/factories/CustomFactory.js";
import {Course} from "@/src/models/entities/Course.js";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";
import {Lesson} from "@/src/models/entities/Lesson.js";

export class CourseFactory extends CustomFactory<Course> {
    readonly model = Course;

    protected definition(faker: Faker): EntityData<Course> {
        const em = (this as any).em as EntityManager;
        const userFactory = new UserFactory(em);
        const profileFactory = new ProfileFactory(em);
        return {
            title: faker.random.words(faker.datatype.number({min: 5, max: 20})),
            description: faker.random.words(faker.datatype.number({min: 20, max: 30})),
            image: faker.image.imageUrl(100, 100),
            isPublic: true,
            level: LanguageLevel.ADVANCED_1,
            addedOn: new Date(Math.round(Date.now() / 1000) * 1000), // now rounded to nearest second because db column is timestampz(0)
            addedBy: profileFactory.makeDefinition({user: userFactory.makeDefinition({}, ["profile"])}),
            lessons: []
        };
    }

    override makeDefinition(overrideParameters?: EntityData<Course>): EntityData<Course> {
        if (Array.isArray(overrideParameters?.lessons))
            (overrideParameters!.lessons as EntityData<Lesson>[]).forEach((l, i) => l.orderInCourse = i + 1);
        return super.makeDefinition(overrideParameters);
    }
}
