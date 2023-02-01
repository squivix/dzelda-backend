import {Faker} from "@mikro-orm/seeder";
import {EntityData} from "@mikro-orm/core";
import {CustomFactory} from "@/src/seeders/factories/CustomFactory.js";
import {Course} from "@/src/models/entities/Course.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";
import {randomEnum} from "@/tests/utils.js";
import {LanguageFactory} from "@/src/seeders/factories/LanguageFactory.js";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {LessonFactory} from "@/src/seeders/factories/LessonFactory.js";
import {Lesson} from "@/src/models/entities/Lesson.js";

export class CourseFactory extends CustomFactory<Course> {
    readonly model = Course;

    public static makeDefinition(faker: Faker): EntityData<Course> {
        return {
            title: faker.random.words(faker.datatype.number({min: 4, max: 20})),
            description: faker.random.words(faker.datatype.number({min: 20, max: 30})),
            image: faker.image.imageUrl(100, 100),
            isPublic: faker.datatype.boolean(),
            level: randomEnum(LanguageLevel),
            language: LanguageFactory.makeDefinition(faker),
            addedBy: {
                ...ProfileFactory.makeDefinition(faker),
                user: {...UserFactory.makeDefinition(faker), profile: null}
            },
            lessons: [...Array(faker.datatype.number({min: 0, max: 10}))].map((v, i) => ({
                ...LessonFactory.makeDefinition(faker),
                orderInCourse: i
            }))
        };
    }

    protected definition(faker: Faker): EntityData<Course> {
        return CourseFactory.makeDefinition(faker);
    }
}