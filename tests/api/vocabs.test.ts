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
import {faker} from "@faker-js/faker";

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
        expect(response.json()).toEqual(expect.objectContaining(vocabSerializer.serialize(newVocab)));
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const language = await context.languageFactory.createOne();
        const newVocab = context.vocabFactory.makeOne({language: language});
        const response = await makeRequest({
            languageCode: language.code,
            text: newVocab.text,
            isPhrase: newVocab.isPhrase
        });

        expect(response.statusCode).toEqual(401);
    });
    describe("If fields are missing return 400", async () => {
        test<LocalTestContext>("If languageCode is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newVocab = context.vocabFactory.makeOne({language: language});
            const response = await makeRequest({
                text: newVocab.text,
                isPhrase: newVocab.isPhrase
            }, session.token);

            expect(response.statusCode).toEqual(400);
        });
        test<LocalTestContext>("If text is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newVocab = context.vocabFactory.makeOne({language: language});
            const response = await makeRequest({
                languageCode: language.code,
                isPhrase: newVocab.isPhrase
            }, session.token);

            expect(response.statusCode).toEqual(400);
        });
        test<LocalTestContext>("If isPhrase is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newVocab = context.vocabFactory.makeOne({language: language});
            const response = await makeRequest({
                languageCode: language.code,
                text: newVocab.text,
            }, session.token);

            expect(response.statusCode).toEqual(400);
        });
    });
    describe("If fields are invalid return 400", async () => {
        describe("If language is invalid return 400", async () => {
            test<LocalTestContext>("If languageCode is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newVocab = context.vocabFactory.makeOne({language: language});
                const response = await makeRequest({
                    languageCode: faker.random.alphaNumeric(10),
                    text: newVocab.text,
                    isPhrase: newVocab.isPhrase
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
            test<LocalTestContext>("If language does not exist return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newVocab = context.vocabFactory.makeOne({language: language});
                const response = await makeRequest({
                    languageCode: faker.random.alphaNumeric(2),
                    text: newVocab.text,
                    isPhrase: newVocab.isPhrase
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
        });
        describe("If text is invalid return 400", async () => {
            test<LocalTestContext>("If text contains no parsable words return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newVocab = context.vocabFactory.makeOne({language: language});
                const response = await makeRequest({
                    languageCode: language.code,
                    text: faker.random.numeric(5),
                    isPhrase: newVocab.isPhrase
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
            test<LocalTestContext>("If text contains more than one parsable words and isPhrase is false return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const response = await makeRequest({
                    languageCode: language.code,
                    text: faker.random.words(2),
                    isPhrase: false
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
            test<LocalTestContext>("If text is longer than 255 characters return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newVocab = context.vocabFactory.makeOne({language: language});
                const response = await makeRequest({
                    languageCode: language.code,
                    text: faker.random.alpha(300),
                    isPhrase: newVocab.isPhrase
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
        });
        test<LocalTestContext>("If isPhrase is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newVocab = context.vocabFactory.makeOne({language: language});
            const response = await makeRequest({
                languageCode: language.code,
                text: newVocab.text,
                isPhrase: "kinda?"
            }, session.token);

            expect(response.statusCode).toEqual(400);
        });
    });
    test<LocalTestContext>("If vocab with same text already exists for the language return 200", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const oldVocab = await context.vocabFactory.createOne({language: language});
        const newVocab = context.vocabFactory.makeOne({language: language, text: oldVocab.text});
        const response = await makeRequest({
            languageCode: language.code,
            text: newVocab.text,
            isPhrase: newVocab.isPhrase
        }, session.token);

        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual(vocabSerializer.serialize(oldVocab));
    });

});