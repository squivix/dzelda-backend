import {beforeEach, describe, expect, test, TestContext, vi} from "vitest";
import {faker} from "@faker-js/faker";
import {orm} from "@/src/server.js";
import {LanguageFactory} from "@/devtools/factories/LanguageFactory.js";
import {buildQueryString, createComparator, fetchRequest} from "@/tests/integration/utils.js";
import {UserFactory} from "@/devtools/factories/UserFactory.js";
import {SessionFactory} from "@/devtools/factories/SessionFactory.js";
import {InjectOptions} from "light-my-request";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {Language} from "@/src/models/entities/Language.js";
import {EntityRepository} from "@mikro-orm/core";
import {ProfileFactory} from "@/devtools/factories/ProfileFactory.js";
import {languageSerializer} from "@/src/presentation/response/serializers/entities/LanguageSerializer.js";
import {LessonFactory} from "@/devtools/factories/LessonFactory.js";
import {CourseFactory} from "@/devtools/factories/CourseFactory.js";
import {MapPastViewerLesson} from "@/src/models/entities/MapPastViewerLesson.js";
import {MapLearnerDictionary} from "@/src/models/entities/MapLearnerDictionary.js";
import {DictionaryFactory} from "@/devtools/factories/DictionaryFactory.js";
import {VocabFactory} from "@/devtools/factories/VocabFactory.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {MeaningFactory} from "@/devtools/factories/MeaningFactory.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";
import {learnerLanguageSerializer} from "@/src/presentation/response/serializers/mappings/LearnerLanguageSerializer.js";
import {parsers} from "dzelda-common";


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


vi.mock("dzelda-common", async () => {
    return {
        ...(await vi.importActual("dzelda-common") as any),
        getParser: vi.fn(() => parsers["en"])
    };
});
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
    const defaultSortComparator = createComparator(Language, [
        {property: "name", order: "asc"},
        {property: "code", order: "asc"},
        {property: "id", order: "asc"}
    ]);

    test<LocalTestContext>("If there are no filters return all languages", async (context) => {
        const expectedLanguages = await context.languageFactory.create(10);
        expectedLanguages.sort(defaultSortComparator);

        const response = await makeRequest();

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(languageSerializer.serializeList(expectedLanguages));
    });
    describe("If there are filters return languages that match those filters", async () => {
        describe("tests isSupported filter", async () => {
            test<LocalTestContext>("If isSupported filter is true return only supported languages", async (context) => {
                const expectedLanguages = await context.languageFactory.create(5, {isSupported: true});
                await context.languageFactory.create(5, {isSupported: false});
                expectedLanguages.sort(defaultSortComparator);

                const response = await makeRequest({isSupported: true});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(languageSerializer.serializeList(expectedLanguages));
            });
            test<LocalTestContext>("If isSupported filter is false return only unsupported languages", async (context) => {
                const expectedLanguages = await context.languageFactory.create(5, {isSupported: false});
                await context.languageFactory.create(5, {isSupported: true});
                expectedLanguages.sort(defaultSortComparator);

                const response = await makeRequest({isSupported: false});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(languageSerializer.serializeList(expectedLanguages));
            });
            test<LocalTestContext>("If isSupported filter is invalid return 400", async (context) => {
                await context.languageFactory.create(5, {isSupported: true});
                await context.languageFactory.create(5, {isSupported: false});

                const response = await makeRequest({isSupported: "Invalid data"});
                expect(response.statusCode).to.equal(400);
            });
        });
    });
    describe("test sort", () => {
        describe("test sortBy", () => {
            test<LocalTestContext>("test sortBy name", async (context) => {
                const expectedLanguages = [
                    await context.languageFactory.createOne({name: "abc"}),
                    await context.languageFactory.createOne({name: "def"}),
                ];

                const response = await makeRequest({sortBy: "name"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(languageSerializer.serializeList(expectedLanguages));
            });
            test<LocalTestContext>("test sortBy learnersCount", async (context) => {
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();
                const expectedLanguages = [
                    await context.languageFactory.createOne({learners: []}),
                    await context.languageFactory.createOne({learners: [user1]}),
                    await context.languageFactory.createOne({learners: [user1, user2]}),
                ];

                const response = await makeRequest({sortBy: "learnersCount"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(languageSerializer.serializeList(expectedLanguages));
            });
            test<LocalTestContext>("if sortBy is invalid return 400", async (context) => {
                const response = await makeRequest({sortBy: "flag"});
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<LocalTestContext>("If sortOrder is asc return the languages in ascending order", async (context) => {
                const expectedLanguages = [
                    await context.languageFactory.createOne({name: "abc"}),
                    await context.languageFactory.createOne({name: "def"}),
                ];

                const response = await makeRequest({sortOrder: "asc"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(languageSerializer.serializeList(expectedLanguages));
            });
            test<LocalTestContext>("If sortOrder is desc return the languages in ascending order", async (context) => {
                const expectedLanguages = [
                    await context.languageFactory.createOne({name: "def"}),
                    await context.languageFactory.createOne({name: "abc"}),
                ];

                const response = await makeRequest({sortOrder: "desc"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(languageSerializer.serializeList(expectedLanguages));
            });
            test<LocalTestContext>("If sortOrder is invalid return 400", async (context) => {
                const response = await makeRequest({sortOrder: "rising"});
                expect(response.statusCode).to.equal(400);
            });
        });
    });
});

/**{@link LanguageController#getUserLanguages}*/
describe("GET users/:username/languages/", function () {
    const makeRequest = async (username: string, queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/${username}/languages/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const defaultSortComparator = createComparator(Language, [
        {property: "name", order: "asc"},
        {property: "code", order: "asc"},
        {property: "id", order: "asc"}
    ]);
    test<LocalTestContext>(`If username exists and is public return languages user is learning`, async (context) => {
        const user = await context.userFactory.createOne({profile: {isPublic: true}});
        const expectedLanguages = await context.languageFactory.create(10);
        expectedLanguages.sort(defaultSortComparator);
        const expectedMappings = expectedLanguages.map(language => {
            language.learnersCount++;
            return context.em.create(MapLearnerLanguage, {language, learner: user.profile});
        });
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
        const expectedLanguages = await context.languageFactory.create(10);
        expectedLanguages.sort(defaultSortComparator);
        const expectedMappings = expectedLanguages.map(language => {
            language.learnersCount++;
            return context.em.create(MapLearnerLanguage, {language, learner: user.profile});
        });
        await context.em.flush();

        const response = await makeRequest(user.username, {}, session.token);

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
        const expectedLanguages = await context.languageFactory.create(10);
        expectedLanguages.sort(defaultSortComparator);
        const expectedMappings = expectedLanguages.map(language => {
            language.learnersCount++;
            return context.em.create(MapLearnerLanguage, {language, learner: user.profile});
        });
        await context.em.flush();

        const response = await makeRequest("me", {}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(learnerLanguageSerializer.serializeList(expectedMappings));
    });

    describe("test sort", () => {
        describe("test sortBy", () => {
            test<LocalTestContext>("test sortBy name", async (context) => {
                const user = await context.userFactory.createOne({profile: {isPublic: true}});
                const expectedLanguages = [
                    await context.languageFactory.createOne({name: "abc"}),
                    await context.languageFactory.createOne({name: "def"})
                ];
                const expectedMappings = expectedLanguages.map(language => {
                    language.learnersCount++;
                    return context.em.create(MapLearnerLanguage, {language, learner: user.profile});
                });
                await context.em.flush();

                const response = await makeRequest(user.username, {sortBy: "name"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(learnerLanguageSerializer.serializeList(expectedMappings));
            });
            test<LocalTestContext>("test sortBy learnersCount", async (context) => {
                const user = await context.userFactory.createOne({profile: {isPublic: true}});
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();
                const expectedLanguages = [
                    await context.languageFactory.createOne({learners: []}),
                    await context.languageFactory.createOne({learners: [user1.profile]}),
                    await context.languageFactory.createOne({learners: [user1.profile, user2.profile]})
                ];
                const expectedMappings = expectedLanguages.map(language => {
                    language.learnersCount++;
                    return context.em.create(MapLearnerLanguage, {language, learner: user.profile});
                });
                await context.em.flush();

                const response = await makeRequest(user.username, {sortBy: "learnersCount"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(learnerLanguageSerializer.serializeList(expectedMappings));
            });
            test<LocalTestContext>("test sortBy lastOpened", async (context) => {
                const user = await context.userFactory.createOne({profile: {isPublic: true}});
                const expectedMappings = [
                    context.em.create(MapLearnerLanguage, {
                        language: context.languageFactory.makeDefinition({learnersCount: 1}), learner: user.profile,
                        lastOpened: new Date("2018-07-22T10:30:45.000Z")
                    }),
                    context.em.create(MapLearnerLanguage, {
                        language: context.languageFactory.makeDefinition({learnersCount: 1}), learner: user.profile,
                        lastOpened: new Date("2023-03-15T20:29:42.000Z")
                    }),
                ];
                await context.em.flush();

                const response = await makeRequest(user.username, {sortBy: "lastOpened"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(learnerLanguageSerializer.serializeList(expectedMappings));
            });
            test<LocalTestContext>("if sortBy is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne({profile: {isPublic: true}});

                const response = await makeRequest(user.username, {sortBy: "flag"});

                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<LocalTestContext>("If sortOrder is asc return the languages in ascending order", async (context) => {
                const user = await context.userFactory.createOne({profile: {isPublic: true}});
                const expectedLanguages = [
                    await context.languageFactory.createOne({name: "abc"}),
                    await context.languageFactory.createOne({name: "def"})
                ];
                const expectedMappings = expectedLanguages.map(language => {
                    language.learnersCount++;
                    return context.em.create(MapLearnerLanguage, {language, learner: user.profile});
                });
                await context.em.flush();

                const response = await makeRequest(user.username, {sortOrder: "asc"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(learnerLanguageSerializer.serializeList(expectedMappings));
            });
            test<LocalTestContext>("If sortOrder is desc return the languages in ascending order", async (context) => {
                const user = await context.userFactory.createOne({profile: {isPublic: true}});
                const expectedLanguages = [
                    await context.languageFactory.createOne({name: "def"}),
                    await context.languageFactory.createOne({name: "abc"}),
                ];
                const expectedMappings = expectedLanguages.map(language => {
                    language.learnersCount++;
                    return context.em.create(MapLearnerLanguage, {language, learner: user.profile});
                });
                await context.em.flush();

                const response = await makeRequest(user.username, {sortOrder: "desc"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(learnerLanguageSerializer.serializeList(expectedMappings));
            });
            test<LocalTestContext>("If sortOrder is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne({profile: {isPublic: true}});

                const response = await makeRequest(user.username, {sortOrder: "rising"});

                expect(response.statusCode).to.equal(400);
            });
        });
    });
});

/**{@link LanguageController#addLanguageToUser}*/
describe("POST users/me/languages/", function () {
    const makeRequest = async (body: object, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `users/me/languages/`,
            payload: body,
        };
        return await fetchRequest(options, authToken);
    };

    test<LocalTestContext>("If user is logged in, and all fields are valid return 201", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learnersCount: 1});
        const expectedMapping = context.em.create(MapLearnerLanguage, {language, learner: user.profile}, {persist: false});

        const response = await makeRequest({languageCode: language.code}, session.token);

        const responseBody = response.json();
        expect(response.statusCode).to.equal(201);
        expect(responseBody).toMatchObject(learnerLanguageSerializer.serialize(expectedMapping, {ignore: ["startedLearningOn", "lastOpened"]}));
        const dbRecord = await context.em.findOne(MapLearnerLanguage, {language, learner: user.profile});
        expect(dbRecord).not.toBeNull();
        expect(learnerLanguageSerializer.serialize(dbRecord!)).toMatchObject(learnerLanguageSerializer.serialize(expectedMapping, {ignore: ["startedLearningOn", "lastOpened"]}));
    });
    test<LocalTestContext>("If user is already learning language return 200", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learnersCount: 1});
        const expectedMapping = context.em.create(MapLearnerLanguage, {language, learner: user.profile});
        await context.em.flush();

        const response = await makeRequest({languageCode: language.code}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(learnerLanguageSerializer.serialize(expectedMapping));
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const language = await context.languageFactory.createOne();

        const response = await makeRequest({languageCode: language.code});
        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();

        const response = await makeRequest({languageCode: language.code}, session.token);
        expect(response.statusCode).to.equal(403);
    });
    describe("If fields are invalid return 400", () => {
        describe("If language is invalid return 400", () => {
            test<LocalTestContext>("If languageCode is invalid  return 400", async (context) => {
                const currentUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: currentUser});

                const response = await makeRequest({languageCode: faker.random.alpha({count: 10})}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If language is not found return 400", async (context) => {
                const currentUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: currentUser});
                const language = context.languageFactory.makeOne();

                const response = await makeRequest({languageCode: language.code}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If language is not supported return 400", async (context) => {
                const currentUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: currentUser});
                const language = await context.languageFactory.createOne({isSupported: false});

                const response = await makeRequest({languageCode: language.code}, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
    });
});

/**{@link LanguageController#updateUserLanguage}*/
describe("PATCH users/me/languages/:languageCode/", () => {
    const makeRequest = async (languageCode: string, body: object, authToken?: string) => {
        const options: InjectOptions = {
            method: "PATCH",
            url: `users/me/languages/${languageCode}/`,
            payload: body,
        };
        return await fetchRequest(options, authToken);
    };
    test<LocalTestContext>("If user is logged in, and all fields are valid return 200", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne({learnersCount: 1});
        const oldLastOpened = "2023-02-14T11:00:43.818Z", oldAddedOn = "2023-01-14T11:00:43.818Z";
        const expectedMapping = context.em.create(MapLearnerLanguage, {
            learner: user.profile,
            language: language,
            startedLearningOn: new Date(oldAddedOn),
            lastOpened: new Date(oldLastOpened)
        });
        await context.em.flush();

        const response = await makeRequest(language.code, {lastOpened: "now"}, session.token);

        const responseBody = response.json();
        const dbRecord = await context.em.findOneOrFail(MapLearnerLanguage, {language, learner: user.profile});

        expect(response.statusCode).to.equal(200);
        expect(responseBody).toMatchObject(learnerLanguageSerializer.serialize(expectedMapping, {ignore: ["startedLearningOn", "lastOpened"]}));
        expect(responseBody).toMatchObject(learnerLanguageSerializer.serialize(dbRecord));
        const {addedOn: newAddedOn, lastOpened: newLastOpened} = responseBody;
        expect(newAddedOn).not.toEqual(oldAddedOn);
        expect(newLastOpened).not.toEqual(oldLastOpened);
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const language = await context.languageFactory.createOne();

        const response = await makeRequest(language.code, {lastOpened: "now"});

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();

        const response = await makeRequest(language.code, {lastOpened: "now"}, session.token);

        expect(response.statusCode).to.equal(403);
    });
    test<LocalTestContext>("If languageCode is invalid return  400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});

        const response = await makeRequest("", {lastOpened: "now"}, session.token);

        expect(response.statusCode).to.equal(400);
    });
    test<LocalTestContext>("If language is not found return  404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.makeOne();

        const response = await makeRequest(language.code, {lastOpened: "now"}, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If user is not learning language return  404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();

        const response = await makeRequest(language.code, {lastOpened: "now"}, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If lastOpened is not 'now' return  400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();

        const response = await makeRequest(language.code, {lastOpened: "2023-02-14T11:00:43.818Z"}, session.token);

        expect(response.statusCode).to.equal(400);
    });
});

/**{@link LanguageController#deleteUserLanguage}*/
describe("DELETE users/me/languages/:languageCode/", () => {
    const makeRequest = async (languageCode: string, authToken?: string) => {
        const options: InjectOptions = {
            method: "DELETE",
            url: `users/me/languages/${languageCode}/`,
        };
        return await fetchRequest(options, authToken);
    };
    test<LocalTestContext>("If user is logged in and is learning language delete language for user and all associated resources and return 204", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne({learners: user.profile});

        const courses = await context.courseFactory.create(3, {language});
        const lessons = [...await context.lessonFactory.create(3, {course: courses[0]}), ...await context.lessonFactory.create(3, {course: courses[1]}), ...await context.lessonFactory.create(3, {course: courses[2]})];
        await context.em.insertMany(MapPastViewerLesson, lessons.map(l => ({lesson: l, pastViewer: user.profile})));
        const dictionaries = await context.dictionaryFactory.create(3, {language});
        await context.em.insertMany(MapLearnerDictionary, dictionaries.map(d => ({dictionary: d, learner: user.profile})));
        const vocabs = await context.vocabFactory.create(3, {language});
        await context.em.insertMany(MapLearnerVocab, vocabs.map(v => ({vocab: v, learner: user.profile})));
        const meaningLanguage = await context.languageFactory.createOne();

        const meanings = [
            ...await context.meaningFactory.create(3, {addedBy: user.profile, vocab: vocabs[0], language: meaningLanguage}),
            ...await context.meaningFactory.create(3, {addedBy: user.profile, vocab: vocabs[1], language: meaningLanguage}),
            ...await context.meaningFactory.create(3, {addedBy: user.profile, vocab: vocabs[2], language: meaningLanguage})];
        await context.em.insertMany(MapLearnerMeaning, meanings.map(m => ({meaning: m, learner: user.profile})));

        const response = await makeRequest(language.code, session.token);

        expect(response.statusCode).to.equal(204);

        expect((await context.em.findOne(MapLearnerLanguage, {learner: user.profile, language}))?.toObject() ?? null).toBeNull();
        expect(await context.em.find(MapLearnerDictionary, {learner: user.profile, dictionary: {language}})).toHaveLength(0);
        expect(await context.em.find(MapLearnerVocab, {learner: user.profile, vocab: {language}})).toHaveLength(0);
        expect(await context.em.find(MapLearnerMeaning, {learner: user.profile, meaning: {vocab: {language}}})).toHaveLength(0);
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne({learners: user.profile});

        const response = await makeRequest(language.code);

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});

        const response = await makeRequest(language.code, session.token);

        expect(response.statusCode).to.equal(403);
    });
    test<LocalTestContext>("If languageCode is invalid return  400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});

        const response = await makeRequest("", session.token);

        expect(response.statusCode).to.equal(400);
    });
    test<LocalTestContext>("If language is not found return  404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.makeOne();

        const response = await makeRequest(language.code, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If user is not learning language return  404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();

        const response = await makeRequest(language.code, session.token);

        expect(response.statusCode).to.equal(404);
    });
});


/**{@link LanguageController#resetUserLanguageProgress}*/
describe.todo("DELETE users/me/languages/:languageCode/", () => {
});
