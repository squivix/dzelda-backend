import {Faker} from "@mikro-orm/seeder";
import {User} from "@/src/models/entities/auth/User.js";
import {EntityData} from "@mikro-orm/core";
import {CustomFactory} from "@/src/seeders/factories/CustomFactory.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {courseSerializer} from "@/src/schemas/response/serializers/CourseSerializer.js";
import {CourseFactory} from "@/src/seeders/factories/CourseFactory.js";

export class LessonFactory extends CustomFactory<Lesson> {
    readonly model = Lesson;


    public static makeDefinition(faker: Faker): EntityData<Lesson> {
        return {
            title: faker.random.words(faker.datatype.number({min: 4, max: 10})),
            text: faker.random.words(faker.datatype.number({min: 50, max: 100})),
            image: faker.image.imageUrl(100, 100),
            audio: "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg"
        };
    }

    protected definition(faker: Faker): EntityData<User> {
        return LessonFactory.makeDefinition(faker);
    }
}