import {beforeEach, describe, expect, test, TestContext} from "vitest";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";
import {LanguageFactory} from "@/src/seeders/factories/LanguageFactory.js";
import {LessonFactory} from "@/src/seeders/factories/LessonFactory.js";
import {CourseFactory} from "@/src/seeders/factories/CourseFactory.js";
import {CourseRepo} from "@/src/models/repos/CourseRepo.js";
import {LessonRepo} from "@/src/models/repos/LessonRepo.js";
import {EntityRepository} from "@mikro-orm/core";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {orm} from "@/src/server.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {Course} from "@/src/models/entities/Course.js";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/tests/api/utils.js";
import {VocabFactory} from "@/src/seeders/factories/VocabFactory.js";
import {vocabSerializer} from "@/src/schemas/response/serializers/VocabSerializer.js";

interface LocalTestContext extends TestContext {
    languageFactory: LanguageFactory;
    lessonFactory: LessonFactory;
    courseFactory: CourseFactory;
    vocabFactory: VocabFactory;
    courseRepo: CourseRepo;
    lessonRepo: LessonRepo;
    vocabRepo: EntityRepository<Vocab>;
}

beforeEach<LocalTestContext>((context) => {
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.profileFactory = new ProfileFactory(context.em);
    context.sessionFactory = new SessionFactory(context.em);
    context.lessonFactory = new LessonFactory(context.em);
    context.courseFactory = new CourseFactory(context.em);
    context.languageFactory = new LanguageFactory(context.em);
    context.vocabFactory = new VocabFactory(context.em);

    context.vocabRepo = context.em.getRepository(Vocab);
    context.lessonRepo = context.em.getRepository(Lesson) as LessonRepo;
    context.courseRepo = context.em.getRepository(Course) as CourseRepo;
});
/**@link VocabController#createVocab*/
describe("POST vocabs/", () => {
    const makeRequest = async (body: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `vocabs/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };

    test<LocalTestContext>("If user is logged in and all fields are valid create a new vocab and return it", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const newVocab = context.vocabFactory.makeOne({language: language});
        const response = await makeRequest({
            languageCode: language.code,
            text: newVocab.text,
            isPhrase: newVocab.isPhrase
        }, session.token);

        expect(response.statusCode).toEqual(201);
        expect(response.json()).toEqual(vocabSerializer.serialize(newVocab));
    });

});