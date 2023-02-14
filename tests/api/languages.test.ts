import {beforeEach, describe, expect, test, TestContext} from "vitest";
import {faker} from "@faker-js/faker";
import {orm} from "@/src/server.js";
import {LanguageFactory} from "@/src/seeders/factories/LanguageFactory.js";
import {buildQueryString, fetchRequest} from "@/tests/api/utils.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";
import {InjectOptions} from "light-my-request";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {Language} from "@/src/models/entities/Language.js";
import {EntityRepository} from "@mikro-orm/core";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";
import {languageSerializer} from "@/src/schemas/response/serializers/LanguageSerializer.js";

// beforeEach(truncateDb);

interface LocalTestContext extends TestContext {
    languageRepo: EntityRepository<Language>;
    mapLearnerLanguageRepo: EntityRepository<MapLearnerLanguage>;
    languageFactory: LanguageFactory;
}

beforeEach<LocalTestContext>((context) => {
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.profileFactory = new ProfileFactory(context.em);
    context.sessionFactory = new SessionFactory(context.em);
    context.languageFactory = new LanguageFactory(context.em);
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
        await context.languageFactory.create(10);

        const response = await makeRequest();

        const languages = await context.languageRepo.find({}, {refresh: true});
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(languageSerializer.serializeList(languages));
    });

    test<LocalTestContext>("If there are invalid filters return all languages", async (context) => {
        await context.languageFactory.create(10);

        const response = await makeRequest({[faker.datatype.string()]: faker.random.word()});

        const languages = await context.languageRepo.find({}, {refresh: true});
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(languageSerializer.serializeList(languages));
    });

    describe("If there are filters languages that match those filters", async () => {
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
    test<LocalTestContext>(`If username exists and is public return languages`, async (context) => {
        const user = await context.userFactory.createOne({profile: {isPublic: true}});
        await context.languageFactory.create(10, {learners: user.profile});
        const response = await makeRequest(user.username);

        const languages = await context.languageRepo.find({learners: user.profile}, {refresh: true});
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(languageSerializer.serializeList(languages));
    });
    test<LocalTestContext>(`If username exists and is not public but authenticated as user return languages`, async (context) => {
        const user = await context.userFactory.createOne({profile: {isPublic: false}});
        await context.languageFactory.create(10, {learners: user.profile});
        const session = await context.sessionFactory.createOne({user: user});

        const response = await makeRequest(user.username, session.token);

        const languages = await context.languageRepo.find({learners: user.profile}, {refresh: true});
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(languageSerializer.serializeList(languages));
    });
    test<LocalTestContext>(`If username is me and not authenticated as user return 401`, async (context) => {
        const user = await context.userFactory.createOne({profile: {isPublic: false}});
        await context.languageFactory.create(10, {learners: user.profile});

        const response = await makeRequest("me");
        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>(`If username is me and authenticated as user return languages`, async (context) => {
        const user = await context.userFactory.createOne({profile: {isPublic: false}});
        await context.languageFactory.create(10, {learners: user.profile});
        const session = await context.sessionFactory.createOne({user: user});

        const response = await makeRequest("me", session.token);

        const languages = await context.languageRepo.find({learners: user.profile}, {refresh: true});
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(languageSerializer.serializeList(languages));
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
        test<LocalTestContext>("If username is me and authenticated return 201", async (context) => {
            const currentUser = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: currentUser});
            const language = await context.languageFactory.createOne();

            const response = await makeRequest("me", {languageCode: language.code}, session.token);

            const mapping = await context.mapLearnerLanguageRepo.findOne({
                learner: currentUser.profile,
                language: language
            }, {populate: ["language"], refresh: true});

            expect(response.statusCode).to.equal(201);
            expect(mapping).not.toBeNull();
            if (mapping != null)
                expect(response.json()).toEqual(languageSerializer.serialize(mapping.language));
        });
        test<LocalTestContext>("If username is not me and authenticated as user with username return 201", async (context) => {
            const currentUser = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: currentUser});

            const language = await context.languageFactory.createOne();

            const response = await makeRequest(currentUser.username, {languageCode: language.code}, session.token);
            const mapping = await context.mapLearnerLanguageRepo.findOne({
                learner: currentUser.profile,
                language: language
            }, {populate: ["language"], refresh: true});
            expect(response.statusCode).to.equal(201);
            expect(mapping).not.toBeNull();
            if (mapping != null)
                expect(response.json()).toEqual(languageSerializer.serialize(mapping.language));
        });
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
            })
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
            })
        })
    })
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
describe("PATCH users/:username/languages/:languageCode", () => {
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
            const language = await context.languageFactory.createOne({learners: user.profile});
            const oldLastOpened = "2023-02-14T11:00:43.818Z";
            await context.em.upsert(MapLearnerLanguage, {
                learner: user.profile,
                language: language,
                addedOn: new Date(oldLastOpened),
                lastOpened: new Date(oldLastOpened)
            })
            await context.em.flush();

            const response = await makeRequest("me", language.code, {lastOpened: "now"}, session.token);

            const mapping = await context.em.findOneOrFail(MapLearnerLanguage, {learner: user.profile, language: language})
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(languageSerializer.serialize(mapping))
            expect(oldLastOpened).not.toEqual(mapping.lastOpened.toISOString())
        });
        test<LocalTestContext>("If username is not me and authenticated as user with username return 200", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const oldLastOpened = "2023-02-14T11:00:43.818Z";
            await context.em.upsert(MapLearnerLanguage, {
                learner: user.profile,
                language: language,
                addedOn: new Date(oldLastOpened),
                lastOpened: new Date(oldLastOpened)
            })
            await context.em.flush();

            const response = await makeRequest(user.username, language.code, {lastOpened: "now"}, session.token);

            const mapping = await context.em.findOneOrFail(MapLearnerLanguage, {learner: user.profile, language: language})
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(languageSerializer.serialize(mapping))
            expect(oldLastOpened).not.toEqual(mapping.lastOpened.toISOString())
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

        const response = await makeRequest(user.username, faker.random.alpha(5), {lastOpened: "now"}, session.token);

        expect(response.statusCode).to.equal(400);
    });

    test<LocalTestContext>("If language is not found return  400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.makeOne();

        const response = await makeRequest(user.username, language.code, {lastOpened: "now"}, session.token);

        expect(response.statusCode).to.equal(400);
    });

    test<LocalTestContext>("If user is not learning language return  400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();

        const response = await makeRequest(user.username, language.code, {lastOpened: "now"}, session.token);

        expect(response.statusCode).to.equal(400);
    });

    test<LocalTestContext>("If lastOpened is not 'now' return  400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();

        const response = await makeRequest(user.username, language.code, {lastOpened: "2023-02-14T11:00:43.818Z"}, session.token);

        expect(response.statusCode).to.equal(400);
    });
})