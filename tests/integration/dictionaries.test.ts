import {beforeEach, describe, expect, test, TestContext} from "vitest";
import {orm} from "@/src/server.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";
import {EntityRepository} from "@mikro-orm/core";
import {DictionaryFactory} from "@/src/seeders/factories/DictionaryFactory.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {InjectOptions} from "light-my-request";
import {buildQueryString, createComparator, fetchRequest} from "@/tests/integration/utils.js";
import {faker} from "@faker-js/faker";
import {dictionarySerializer} from "@/src/presentation/response/serializers/entities/DictionarySerializer.js";
import {LanguageFactory} from "@/src/seeders/factories/LanguageFactory.js";

interface LocalTestContext extends TestContext {
    dictionaryRepo: EntityRepository<Dictionary>;
    dictionaryFactory: DictionaryFactory;
    languageFactory: LanguageFactory;
}

beforeEach<LocalTestContext>(async (context) => {
    await orm.getSchemaGenerator().clearDatabase();
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.profileFactory = new ProfileFactory(context.em);
    context.languageFactory = new LanguageFactory(context.em);
    context.sessionFactory = new SessionFactory(context.em);
    context.dictionaryFactory = new DictionaryFactory(context.em);
    context.dictionaryRepo = context.em.getRepository(Dictionary);
});

/**{@link DictionaryController#getDictionaries}*/
describe("GET dictionaries/", function () {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `dictionaries/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const defaultSortComparator = createComparator(Dictionary, [
        {property: "name", order: "asc"},
        {property: "id", order: "asc"}]
    );
    test<LocalTestContext>("If there are no filters return all dictionaries", async (context) => {
        const language = await context.languageFactory.createOne();
        const expectedDictionaries = await context.dictionaryFactory.create(5, {language});
        expectedDictionaries.sort(defaultSortComparator);

        const response = await makeRequest({});

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(dictionarySerializer.serializeList(expectedDictionaries));
    });
    describe("test language filter", () => {
        test<LocalTestContext>("If language filter is valid and language exists only return dictionaries in that language", async (context) => {
            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            const expectedDictionaries = await context.dictionaryFactory.create(5, {language: language1});
            await context.dictionaryFactory.create(5, {language: language2});
            expectedDictionaries.sort(defaultSortComparator);

            const response = await makeRequest({languageCode: language1.code});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(dictionarySerializer.serializeList(expectedDictionaries));
        });
        test<LocalTestContext>("If language does not exist return empty dictionary list", async (context) => {
            const language = await context.languageFactory.makeOne();
            await context.dictionaryFactory.create(5, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({languageCode: language.code});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual([]);
        });
        test<LocalTestContext>("If language filter is invalid return 400", async (context) => {
            const response = await makeRequest({languageCode: 12345});
            expect(response.statusCode).to.equal(400);
        });
    });
});

/**{@link DictionaryController#getUserDictionaries}*/
describe("GET users/me/dictionaries/", function () {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/me/dictionaries/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const defaultSortComparator = createComparator(Dictionary, [
        {property: "name", order: "asc"},
        {property: "id", order: "asc"}]
    );

    test<LocalTestContext>("If user is logged in and there are no filters return dictionaries user has saved", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const expectedDictionaries = await context.dictionaryFactory.create(5, {language, learners: user.profile});
        await context.dictionaryFactory.create(5, {language});
        expectedDictionaries.sort(defaultSortComparator);

        const response = await makeRequest({}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(dictionarySerializer.serializeList(expectedDictionaries));
    });
    describe("test language filter", () => {
        test<LocalTestContext>("If language filter is valid and language exists only return saved user dictionaries in that language", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language1 = await context.languageFactory.createOne({learners: user.profile});
            const language2 = await context.languageFactory.createOne({learners: user.profile});
            const expectedDictionaries = await context.dictionaryFactory.create(5, {language: language1, learners: user.profile});
            await context.dictionaryFactory.create(5, {language: language2, learners: user.profile});
            await context.dictionaryFactory.create(5, {language: language1});
            expectedDictionaries.sort(defaultSortComparator);

            const response = await makeRequest({languageCode: language1.code}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(dictionarySerializer.serializeList(expectedDictionaries));
        });
        test<LocalTestContext>("If language does not exist return empty dictionary list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            await context.dictionaryFactory.create(5, {
                language: await context.languageFactory.createOne({learners: user.profile}),
                learners: user.profile
            });
            const language = await context.languageFactory.makeOne();

            const response = await makeRequest({languageCode: language.code}, session.token);
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual([]);
        });
        test<LocalTestContext>("If language filter is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const response = await makeRequest({languageCode: 12345}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    test<LocalTestContext>("If user is not logged in return 401", async () => {
        const response = await makeRequest();
        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const response = await makeRequest({}, session.token);
        expect(response.statusCode).to.equal(403);
    });
});
