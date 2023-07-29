import {beforeEach, describe, expect, test, TestContext, vi} from "vitest";
import {faker} from "@faker-js/faker";
import {orm} from "@/src/server.js";
import {LanguageFactory} from "@/src/seeders/factories/LanguageFactory.js";
import {buildQueryString, fetchRequest} from "@/tests/integration/utils.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";
import {InjectOptions} from "light-my-request";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {Language} from "@/src/models/entities/Language.js";
import {EntityRepository} from "@mikro-orm/core";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";
import {languageSerializer} from "@/src/presentation/response/serializers/entities/LanguageSerializer.js";
import {LessonFactory} from "@/src/seeders/factories/LessonFactory.js";
import {CourseFactory} from "@/src/seeders/factories/CourseFactory.js";
import {MapLearnerLesson} from "@/src/models/entities/MapLearnerLesson.js";
import {MapLearnerDictionary} from "@/src/models/entities/MapLearnerDictionary.js";
import {DictionaryFactory} from "@/src/seeders/factories/DictionaryFactory.js";
import {VocabFactory} from "@/src/seeders/factories/VocabFactory.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {MeaningFactory} from "@/src/seeders/factories/MeaningFactory.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";
import {learnerLanguageSerializer} from "@/src/presentation/response/serializers/mappings/LearnerLanguageSerializer.js";
import * as parserExports from "@/src/utils/parsers/parsers.js";


interface LocalTestContext extends TestContext {
    languageRepo: EntityRepository<Language>;
    mapLearnerLanguageRepo: EntityRepository<MapLearnerLanguage>;
    languageFactory: LanguageFactory;
    courseFactory: CourseFactory;
    lessonFactory: LessonFactory;
    dictionaryFactory: DictionaryFactory;
    vocabFactory: VocabFactory;
    meaningFactory: MeaningFactory;
}

beforeEach<LocalTestContext>(async (context) => {
    await orm.getSchemaGenerator().clearDatabase();
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.profileFactory = new ProfileFactory(context.em);
    context.sessionFactory = new SessionFactory(context.em);
    context.languageFactory = new LanguageFactory(context.em);
    context.lessonFactory = new LessonFactory(context.em);
    context.courseFactory = new CourseFactory(context.em);
    context.dictionaryFactory = new DictionaryFactory(context.em);
    context.vocabFactory = new VocabFactory(context.em);
    context.meaningFactory = new MeaningFactory(context.em);
    context.languageRepo = context.em.getRepository(Language);
    context.mapLearnerLanguageRepo = context.em.getRepository(MapLearnerLanguage);
});


/**{@link LanguageController#getLanguages}*/
describe("GET languages/", function () {
    const makeRequest = async (queryParams: object = {}) => {
        return await fetchRequest({
            method: "GET",
            url: `languages/${buildQueryString(queryParams)}`,
        });
    };

    test<LocalTestContext>("If there are no filters return all languages", async (context) => {
        const expectedLanguages = await context.languageFactory.create(10);

        const response = await makeRequest();

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(languageSerializer.serializeList(expectedLanguages));
    });

    describe("If there are filters return languages that match those filters", async () => {
        describe("tests isSupported filter", async () => {
            test<LocalTestContext>("If isSupported filter is true return only supported languages", async (context) => {
                await context.languageFactory.create(5, {isSupported: true});
                await context.languageFactory.create(5, {isSupported: false});

                const response = await makeRequest({isSupported: true});

                const supportedLanguages = await context.languageRepo.find({isSupported: true}, {refresh: true});
                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(languageSerializer.serializeList(supportedLanguages));
            });
            test<LocalTestContext>("If isSupported filter is false return only unsupported languages", async (context) => {
                await context.languageFactory.create(5, {isSupported: true});
                await context.languageFactory.create(5, {isSupported: false});

                const response = await makeRequest({isSupported: false});

                const unsupportedLanguages = await context.languageRepo.find({isSupported: false}, {refresh: true});
                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(languageSerializer.serializeList(unsupportedLanguages));
            });
            test<LocalTestContext>("If isSupported filter is invalid return 400", async (context) => {
                await context.languageFactory.create(5, {isSupported: true});
                await context.languageFactory.create(5, {isSupported: false});

                const response = await makeRequest({isSupported: "Invalid data"});
                expect(response.statusCode).to.equal(400);
            });
        });
    });
});

/**{@link LanguageController#getUserLanguages}*/
describe("GET users/:username/languages/", function () {
    const makeRequest = async (username: string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/${username}/languages/`,
        };
        return await fetchRequest(options, authToken);
    };
    test<LocalTestContext>(`If username exists and is public return languages user is learning`, async (context) => {
        const user = await context.userFactory.createOne({profile: {isPublic: true}});
        const expectedLanguages = await context.languageFactory.create(10, {learnersCount: 1});
        const expectedMappings = expectedLanguages.map(language => context.em.create(MapLearnerLanguage, {
            language, learner: user.profile
        }));
        await context.em.flush();

        const response = await makeRequest(user.username);

        //TODO hide lastOpened from other users
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(learnerLanguageSerializer.serializeList(expectedMappings));
    });
    test<LocalTestContext>("If username does not exist return 404", async () => {
        const response = await makeRequest(faker.random.alphaNumeric(20));
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>(`If username exists and is not public and not authenticated as user return 404`, async (context) => {
        const user = await context.userFactory.createOne({profile: {isPublic: false}});
        await context.languageFactory.create(10, {learners: user.profile});

        const response = await makeRequest(user.username);
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>(`If username exists and is not public but authenticated as user return languages`, async (context) => {
        const user = await context.userFactory.createOne({profile: {isPublic: false}});
        const session = await context.sessionFactory.createOne({user: user});
        const expectedLanguages = await context.languageFactory.create(10, {learnersCount: 1});
        const expectedMappings = expectedLanguages.map(language => context.em.create(MapLearnerLanguage, {
            language, learner: user.profile
        }));
        await context.em.flush();

        const response = await makeRequest(user.username, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(learnerLanguageSerializer.serializeList(expectedMappings));
    });
    test<LocalTestContext>(`If username is me and not authenticated as user return 401`, async (context) => {
        const user = await context.userFactory.createOne({profile: {isPublic: false}});
        await context.languageFactory.create(10, {learners: user.profile});

        const response = await makeRequest("me");
        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>(`If username is me and authenticated as user return languages`, async (context) => {
        const user = await context.userFactory.createOne({profile: {isPublic: false}});
        const session = await context.sessionFactory.createOne({user: user});
        const expectedLanguages = await context.languageFactory.create(10, {learnersCount: 1});
        const expectedMappings = expectedLanguages.map(language => context.em.create(MapLearnerLanguage, {
            language, learner: user.profile
        }));
        await context.em.flush();

        const response = await makeRequest("me", session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(learnerLanguageSerializer.serializeList(expectedMappings));
    });
});

/**{@link LanguageController#addLanguageToUser}*/
describe("POST users/:username/languages/", function () {
    const makeRequest = async (username: "me" | string, body: object, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `users/${username}/languages/`,
            payload: body,
        };
        return await fetchRequest(options, authToken);
    };

    describe("If user is logged in, and all fields are valid return 201", async () => {
        test<LocalTestContext>("If username is me return 201", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learnersCount: 1});
            const expectedMapping = context.em.create(MapLearnerLanguage, {language, learner: user.profile}, {persist: false});

            const response = await makeRequest("me", {languageCode: language.code}, session.token);

            const responseBody = response.json();
            expect(response.statusCode).to.equal(201);
            expect(responseBody).toMatchObject(learnerLanguageSerializer.serialize(expectedMapping, {ignore: ["addedOn", "lastOpened"]}));
            const dbRecord = await context.em.findOne(MapLearnerLanguage, {language, learner: user.profile});
            expect(dbRecord).not.toBeNull();
            if (dbRecord != null) {
                expect(learnerLanguageSerializer.serialize(dbRecord)).toMatchObject(learnerLanguageSerializer.serialize(expectedMapping, {ignore: ["addedOn", "lastOpened"]}));
            }
        });
        test<LocalTestContext>("If username is not me and authenticated as user with username return 201", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learnersCount: 1});
            const expectedMapping = context.em.create(MapLearnerLanguage, {language, learner: user.profile}, {persist: false});

            const response = await makeRequest(user.username, {languageCode: language.code}, session.token);

            const responseBody = response.json();
            expect(response.statusCode).to.equal(201);
            expect(responseBody).toMatchObject(learnerLanguageSerializer.serialize(expectedMapping, {ignore: ["addedOn", "lastOpened"]}));

            const dbRecord = await context.em.findOne(MapLearnerLanguage, {language, learner: user.profile});
            expect(dbRecord).not.toBeNull();
            if (dbRecord != null) {
                expect(learnerLanguageSerializer.serialize(dbRecord)).toMatchObject(learnerLanguageSerializer.serialize(expectedMapping, {ignore: ["addedOn", "lastOpened"]}));
            }
        });
    });
    test<LocalTestContext>("If user is already learning language return 200", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learnersCount: 1});
        const expectedMapping = context.em.create(MapLearnerLanguage, {language, learner: user.profile});
        await context.em.flush();

        const response = await makeRequest("me", {languageCode: language.code}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(learnerLanguageSerializer.serialize(expectedMapping));
    });
    describe("If user is not logged in return 401", async () => {
        test<LocalTestContext>("If username is me and not authenticated return 401", async (context) => {
            const language = await context.languageFactory.createOne();

            const response = await makeRequest("me", {languageCode: language.code});
            expect(response.statusCode).to.equal(401);
        });
        test<LocalTestContext>("If username is not me and not authenticated return 401", async (context) => {
            const user = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();

            const response = await makeRequest(user.username, {languageCode: language.code});
            expect(response.statusCode).to.equal(401);
        });
    });
    describe("If fields are invalid return 400", () => {
        describe("If language is invalid return 400", () => {
            test<LocalTestContext>("If languageCode is invalid  return 400", async (context) => {
                const currentUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: currentUser});

                const response = await makeRequest("me", {languageCode: faker.random.alpha({count: 10})}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If language is not found return 400", async (context) => {
                const currentUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: currentUser});
                const language = context.languageFactory.makeOne();

                const response = await makeRequest("me", {languageCode: language.code}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If language is not supported return 400", async (context) => {
                const currentUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: currentUser});
                const language = await context.languageFactory.createOne({isSupported: false});

                const response = await makeRequest("me", {languageCode: language.code}, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
    });
    describe("If username is not me and not authenticated as user with username return 403", async () => {
        test<LocalTestContext>("If username does not belong to any user return 403", async (context) => {
            const currentUser = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: currentUser});

            const language = await context.languageFactory.createOne();

            const response = await makeRequest(faker.random.alphaNumeric(20), {languageCode: language.code}, session.token);
            expect(response.statusCode).to.equal(403);
        });
        test<LocalTestContext>("If username belongs to another user return 403", async (context) => {
            const currentUser = await context.userFactory.createOne();
            const otherUser = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: currentUser});

            const language = await context.languageFactory.createOne();

            const response = await makeRequest(otherUser.username, {languageCode: language.code}, session.token);
            expect(response.statusCode).to.equal(403);
        });
    });
});

/**{@link LanguageController#updateUserLanguage}*/
describe("PATCH users/:username/languages/:languageCode/", () => {
    const makeRequest = async (username: "me" | string, languageCode: string, body: object, authToken?: string) => {
        const options: InjectOptions = {
            method: "PATCH",
            url: `users/${username}/languages/${languageCode}/`,
            payload: body,
        };
        return await fetchRequest(options, authToken);
    };
    describe("If user is logged in, and all fields are valid return 200", async () => {
        test<LocalTestContext>("If username is me and authenticated return 200", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne({learnersCount: 1});
            const oldLastOpened = "2023-02-14T11:00:43.818Z", oldAddedOn = "2023-01-14T11:00:43.818Z";
            const expectedMapping = context.em.create(MapLearnerLanguage, {
                learner: user.profile,
                language: language,
                addedOn: new Date(oldAddedOn),
                lastOpened: new Date(oldLastOpened)
            });
            await context.em.flush();

            const response = await makeRequest("me", language.code, {lastOpened: "now"}, session.token);

            const responseBody = response.json();
            const dbRecord = await context.em.findOneOrFail(MapLearnerLanguage, {language, learner: user.profile});

            expect(response.statusCode).to.equal(200);
            expect(responseBody).toMatchObject(learnerLanguageSerializer.serialize(expectedMapping, {ignore: ["addedOn", "lastOpened"]}));
            expect(responseBody).toMatchObject(learnerLanguageSerializer.serialize(dbRecord));
            const {addedOn: newAddedOn, lastOpened: newLastOpened} = responseBody;
            expect(newAddedOn).not.toEqual(oldAddedOn);
            expect(newLastOpened).not.toEqual(oldLastOpened);
        });
        test<LocalTestContext>("If username is not me and authenticated as user with username return 200", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne({learnersCount: 1});
            const oldLastOpened = "2023-02-14T11:00:43.818Z", oldAddedOn = "2023-01-14T11:00:43.818Z";
            const expectedMapping = context.em.create(MapLearnerLanguage, {
                learner: user.profile,
                language: language,
                addedOn: new Date(oldAddedOn),
                lastOpened: new Date(oldLastOpened)
            });
            await context.em.flush();

            const response = await makeRequest(user.username, language.code, {lastOpened: "now"}, session.token);

            const responseBody = response.json();
            const dbRecord = await context.em.findOneOrFail(MapLearnerLanguage, {language, learner: user.profile});

            expect(response.statusCode).to.equal(200);
            expect(responseBody).toMatchObject(learnerLanguageSerializer.serialize(expectedMapping, {ignore: ["addedOn", "lastOpened"]}));
            expect(responseBody).toMatchObject(learnerLanguageSerializer.serialize(dbRecord));
            const {addedOn: newAddedOn, lastOpened: newLastOpened} = responseBody;
            expect(newAddedOn).not.toEqual(oldAddedOn);
            expect(newLastOpened).not.toEqual(oldLastOpened);
        });
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const language = await context.languageFactory.createOne();

        const response = await makeRequest("me", language.code, {lastOpened: "now"});

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If username does not belong the authenticated user return 403", async (context) => {
        const user = await context.userFactory.createOne();
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne({learners: otherUser.profile});

        const response = await makeRequest(otherUser.username, language.code, {lastOpened: "now"}, session.token);

        expect(response.statusCode).to.equal(403);
    });
    test<LocalTestContext>("If languageCode is invalid return  400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});

        const response = await makeRequest(user.username, "", {lastOpened: "now"}, session.token);

        expect(response.statusCode).to.equal(400);
    });
    test<LocalTestContext>("If language is not found return  404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.makeOne();

        const response = await makeRequest(user.username, language.code, {lastOpened: "now"}, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If user is not learning language return  404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();

        const response = await makeRequest(user.username, language.code, {lastOpened: "now"}, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If lastOpened is not 'now' return  400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();

        const response = await makeRequest(user.username, language.code, {lastOpened: "2023-02-14T11:00:43.818Z"}, session.token);

        expect(response.statusCode).to.equal(400);
    });
});

/**{@link LanguageController#deleteUserLanguage}*/
describe("DELETE users/:username/languages/:languageCode/", () => {
    const makeRequest = async (username: "me" | string, languageCode: string, authToken?: string) => {
        const options: InjectOptions = {
            method: "DELETE",
            url: `users/${username}/languages/${languageCode}/`,
        };
        return await fetchRequest(options, authToken);
    };
    describe("If user is logged in and is learning language delete language for user and all associated resources and return 204", async () => {
        test<LocalTestContext>("If username is me and authenticated return 204", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne({learners: user.profile});

            const courses = await context.courseFactory.create(3, {language});
            const lessons = [...await context.lessonFactory.create(3, {course: courses[0]}), ...await context.lessonFactory.create(3, {course: courses[1]}), ...await context.lessonFactory.create(3, {course: courses[2]})];
            await context.em.insertMany(MapLearnerLesson, lessons.map(l => ({lesson: l, learner: user.profile})));
            const dictionaries = await context.dictionaryFactory.create(3, {language});
            await context.em.insertMany(MapLearnerDictionary, dictionaries.map(d => ({dictionary: d, learner: user.profile})));
            const vocabs = await context.vocabFactory.create(3, {language});
            await context.em.insertMany(MapLearnerVocab, vocabs.map(v => ({vocab: v, learner: user.profile})));
            const meaningLanguage = await context.languageFactory.createOne();
            vi.spyOn(parserExports, "getParser").mockImplementation((_) => parserExports.parsers["en"]);
            const meanings = [
                ...await context.meaningFactory.create(3, {addedBy: user.profile, vocab: vocabs[0], language: meaningLanguage}),
                ...await context.meaningFactory.create(3, {addedBy: user.profile, vocab: vocabs[1], language: meaningLanguage}),
                ...await context.meaningFactory.create(3, {addedBy: user.profile, vocab: vocabs[2], language: meaningLanguage})];
            await context.em.insertMany(MapLearnerMeaning, meanings.map(m => ({meaning: m, learner: user.profile})));

            const response = await makeRequest("me", language.code, session.token);

            expect(response.statusCode).to.equal(204);

            expect((await context.em.findOne(MapLearnerLanguage, {learner: user.profile, language}))?.toObject() ?? null).toBeNull();
            expect(await context.em.find(MapLearnerLesson, {learner: user.profile, lesson: {course: {language}}})).toHaveLength(0);
            expect(await context.em.find(MapLearnerDictionary, {learner: user.profile, dictionary: {language}})).toHaveLength(0);
            expect(await context.em.find(MapLearnerVocab, {learner: user.profile, vocab: {language}})).toHaveLength(0);
            expect(await context.em.find(MapLearnerMeaning, {learner: user.profile, meaning: {vocab: {language}}})).toHaveLength(0);
        });
        test<LocalTestContext>("If username is not me and authenticated as user with username return 204", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne({learners: user.profile});

            const courses = await context.courseFactory.create(3, {language});
            const lessons = [...await context.lessonFactory.create(3, {course: courses[0]}), ...await context.lessonFactory.create(3, {course: courses[1]}), ...await context.lessonFactory.create(3, {course: courses[2]})];
            await context.em.insertMany(MapLearnerLesson, lessons.map(l => ({lesson: l, learner: user.profile})));
            const dictionaries = await context.dictionaryFactory.create(3, {language});
            await context.em.insertMany(MapLearnerDictionary, dictionaries.map(d => ({dictionary: d, learner: user.profile})));
            const vocabs = await context.vocabFactory.create(3, {language});
            await context.em.insertMany(MapLearnerVocab, vocabs.map(v => ({vocab: v, learner: user.profile})));
            const meaningLanguage = await context.languageFactory.createOne();
            vi.spyOn(parserExports, "getParser").mockImplementation((_) => parserExports.parsers["en"]);
            const meanings = [
                ...await context.meaningFactory.create(3, {addedBy: user.profile, vocab: vocabs[0], language: meaningLanguage}),
                ...await context.meaningFactory.create(3, {addedBy: user.profile, vocab: vocabs[1], language: meaningLanguage}),
                ...await context.meaningFactory.create(3, {addedBy: user.profile, vocab: vocabs[2], language: meaningLanguage})];
            await context.em.insertMany(MapLearnerMeaning, meanings.map(m => ({meaning: m, learner: user.profile})));

            const response = await makeRequest(user.username, language.code, session.token);

            expect(response.statusCode).to.equal(204);
            expect((await context.em.findOne(MapLearnerLanguage, {learner: user.profile, language}))?.toObject() ?? null).toBeNull();
            expect(await context.em.find(MapLearnerLesson, {learner: user.profile, lesson: {course: {language}}})).toHaveLength(0);
            expect(await context.em.find(MapLearnerDictionary, {learner: user.profile, dictionary: {language}})).toHaveLength(0);
            expect(await context.em.find(MapLearnerVocab, {learner: user.profile, vocab: {language}})).toHaveLength(0);
            expect(await context.em.find(MapLearnerMeaning, {learner: user.profile, meaning: {vocab: {language}}})).toHaveLength(0);
        });
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne({learners: user.profile});

        const response = await makeRequest("me", language.code);

        expect(response.statusCode).to.equal(401);
    });

    test<LocalTestContext>("If username does not belong the authenticated user return 403", async (context) => {
        const user = await context.userFactory.createOne();
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne({learners: otherUser.profile});

        const response = await makeRequest(otherUser.username, language.code, session.token);

        expect(response.statusCode).to.equal(403);
    });
    test<LocalTestContext>("If languageCode is invalid return  400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});

        const response = await makeRequest(user.username, "", session.token);

        expect(response.statusCode).to.equal(400);
    });
    test<LocalTestContext>("If language is not found return  404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.makeOne();

        const response = await makeRequest(user.username, language.code, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If user is not learning language return  404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();

        const response = await makeRequest(user.username, language.code, session.token);

        expect(response.statusCode).to.equal(404);
    });
});
