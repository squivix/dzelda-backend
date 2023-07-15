import {beforeEach, describe, expect, test, TestContext} from "vitest";
import {orm} from "@/src/server.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";
import {EntityRepository} from "@mikro-orm/core";
import {DictionaryFactory} from "@/src/seeders/factories/DictionaryFactory.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {InjectOptions} from "light-my-request";
import {buildQueryString, fetchRequest} from "@/tests/integration/utils.js";
import {faker} from "@faker-js/faker";
import {dictionarySerializer} from "@/src/presentation/response/serializers/entities/DictionarySerializer.js";
import {LanguageFactory} from "@/src/seeders/factories/LanguageFactory.js";
import {courseSerializer} from "@/src/presentation/response/serializers/entities/CourseSerializer.js";

interface LocalTestContext extends TestContext {
    dictionaryRepo: EntityRepository<Dictionary>;
    dictionaryFactory: DictionaryFactory;
    languageFactory: LanguageFactory;
}

beforeEach<LocalTestContext>((context) => {
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.profileFactory = new ProfileFactory(context.em);
    context.languageFactory = new LanguageFactory(context.em);
    context.sessionFactory = new SessionFactory(context.em);
    context.dictionaryFactory = new DictionaryFactory(context.em);
    context.dictionaryRepo = context.em.getRepository(Dictionary);
});

/**@link DictionaryController#getUserDictionaries*/
describe("GET users/:username/dictionaries/", function () {
    const makeRequest = async (username: string | "me", queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/${username}/dictionaries/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };

    describe("If user is logged in and there are no filters return dictionaries user has saved", () => {
        test<LocalTestContext>("If username is me", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            await context.dictionaryFactory.create(5, {language, learners: user.profile});
            await context.dictionaryFactory.create(5, {language});

            const response = await makeRequest("me", {}, session.token);

            const userDictionaries = await context.em.find(Dictionary, {learners: user.profile}, {
                populate: ["language"],
                orderBy: [{name: "asc"}, {id: "asc"}]
            });
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(dictionarySerializer.serializeList(userDictionaries));
        });
        test<LocalTestContext>("If username belongs to the currently logged in user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            await context.dictionaryFactory.create(5, {language, learners: user.profile});
            await context.dictionaryFactory.create(5, {language});

            const response = await makeRequest(user.username, {}, session.token);

            const userDictionaries = await context.em.find(Dictionary, {learners: user.profile}, {
                populate: ["language"],
                orderBy: [{name: "asc"}, {id: "asc"}]
            });
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(dictionarySerializer.serializeList(userDictionaries));
        });
    });
    describe("test language filter", () => {
        test<LocalTestContext>("If language filter is valid and language exists only return public dictionaries in that language", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language1 = await context.languageFactory.createOne({learners: user.profile});
            const language2 = await context.languageFactory.createOne({learners: user.profile});
            await context.dictionaryFactory.create(5, {language: language1, learners: user.profile});
            await context.dictionaryFactory.create(5, {language: language2, learners: user.profile});
            await context.dictionaryFactory.create(5, {language: language1});

            const response = await makeRequest("me", {languageCode: language1.code}, session.token);

            const userDictionaries = await context.em.find(Dictionary, {learners: user.profile, language: language1}, {
                populate: ["language"],
                orderBy: [{name: "asc"}, {id: "asc"}]
            });
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(dictionarySerializer.serializeList(userDictionaries));
        });
        test<LocalTestContext>("If language does not exist return empty dictionary list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            await context.dictionaryFactory.create(5, {
                language: await context.languageFactory.createOne({learners: user.profile}),
                learners: user.profile
            });
            const language = await context.languageFactory.makeOne()

            const response = await makeRequest("me", {languageCode: language.code}, session.token);
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual([]);
        });
        test<LocalTestContext>("If language filter is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const response = await makeRequest("me", {languageCode: 12345}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    })
    test<LocalTestContext>("If user is not logged in return 401", async () => {
        const response = await makeRequest("me");
        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If username does not exist return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});

        const response = await makeRequest(faker.random.alphaNumeric(20), {}, session.token);
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>(`If user exists and is not public and not authenticated as user return 404`, async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const otherUser = await context.userFactory.createOne({profile: {isPublic: false}});

        const response = await makeRequest(otherUser.username, {}, session.token);
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>(`If username exists and is public and not authenticated as user return 403`, async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const otherUser = await context.userFactory.createOne({profile: {isPublic: true}});

        const response = await makeRequest(otherUser.username, {}, session.token);
        expect(response.statusCode).to.equal(403);
    });

});
