import {Faker} from "@mikro-orm/seeder";
import {EntityData} from "@mikro-orm/core";
import {CustomFactory} from "@/src/seeders/factories/CustomFactory.js";
import {Course} from "@/src/models/entities/Course.js";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {LessonFactory} from "@/src/seeders/factories/LessonFactory.js";

export class CourseFactory extends CustomFactory<Course> {
    readonly model = Course;

    public static makeDefinition(faker: Faker): EntityData<Course> {
        return {
            title: faker.random.words(faker.datatype.number({min: 5, max: 20})),
            description: faker.random.words(faker.datatype.number({min: 20, max: 30})),
            image: faker.image.imageUrl(100, 100),
            isPublic: true,
            addedOn: new Date(Math.round(Date.now() / 1000) * 1000), // now rounded to nearest second because db column is timestampz(0)
            addedBy: {
                ...ProfileFactory.makeDefinition(faker),
                user: {...UserFactory.makeDefinition(faker), profile: null}
            },
            lessons: []
        };
    }

    protected definition(faker: Faker): EntityData<Course> {
        return CourseFactory.makeDefinition(faker);
    }
}
