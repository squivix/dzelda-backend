import {beforeEach, describe, expect, test} from "vitest";
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

interface LocalTestContext {
    userFactory: UserFactory;
    profileFactory: ProfileFactory;
    sessionFactory: SessionFactory;
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
describe("GET /languages/", function () {
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

    describe("If not authenticated return 401", async () => {
        test<LocalTestContext>("If username is me and not authenticated return 401", async (context) => {
            const language = await context.languageFactory.createOne();

            const response = await makeRequest("me", {code: language.code});
            expect(response.statusCode).to.equal(401);
        });
        test<LocalTestContext>("If username is not me and not authenticated return 401", async (context) => {
            const user = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();

            const response = await makeRequest(user.username, {code: language.code});
            expect(response.statusCode).to.equal(401);
        });
    });
    describe("If username is me or username belongs to authenticated user ", async () => {
        test<LocalTestContext>("If username is me and authenticated return 201", async (context) => {
            const currentUser = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: currentUser});
            const language = await context.languageFactory.createOne();

            const response = await makeRequest("me", {code: language.code}, session.token);

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

            const response = await makeRequest(currentUser.username, {code: language.code}, session.token);
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
    test<LocalTestContext>("If language with code does not exist return 404", async (context) => {
        const currentUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: currentUser});

        const response = await makeRequest("me", {code: faker.random.alpha({count: 2})}, session.token);
        expect(response.statusCode).to.equal(404);
    });
    describe("If username is not me and not authenticated as user with username return 403", async () => {
        test<LocalTestContext>("If username does not belong to any user return 403", async (context) => {
            const currentUser = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: currentUser});

            const language = await context.languageFactory.createOne();

            const response = await makeRequest(faker.random.alphaNumeric(20), {code: language.code}, session.token);
            expect(response.statusCode).to.equal(403);
        });
        test<LocalTestContext>("If username belongs to another user return 403", async (context) => {
            const currentUser = await context.userFactory.createOne();
            const otherUser = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: currentUser});

            const language = await context.languageFactory.createOne();

            const response = await makeRequest(otherUser.username, {code: language.code}, session.token);
            expect(response.statusCode).to.equal(403);
        });
    });
});