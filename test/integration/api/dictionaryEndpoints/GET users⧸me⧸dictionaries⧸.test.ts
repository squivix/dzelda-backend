import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {buildQueryString, createComparator, fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {dictionaryDTO} from "@/src/presentation/response/dtos/Dictionary/DictionaryDTO.js";

/**{@link DictionaryController#getUserDictionaries}*/
describe("GET users/me/dictionaries/", function () {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/me/dictionaries/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    //TODO test dictionary order for learner
    const defaultSortComparator = createComparator(Dictionary, [
        {property: "name", order: "asc"},
        {property: "id", order: "asc"}]
    );

    test<TestContext>("If user is logged in and there are no filters return dictionaries user has saved", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const expectedDictionaries = await context.dictionaryFactory.create(5, {language, learners: user.profile});
        await context.dictionaryFactory.create(5, {language});
        expectedDictionaries.sort(defaultSortComparator);

        const response = await makeRequest({}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(dictionaryDTO.serializeList(expectedDictionaries));
    });
    describe("test language filter", () => {
        test<TestContext>("If language filter is valid and language exists only return saved user dictionaries in that language", async (context) => {
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
            expect(response.json()).toEqual(dictionaryDTO.serializeList(expectedDictionaries));
        });
        test<TestContext>("If language does not exist return empty dictionary list", async (context) => {
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
        test<TestContext>("If language filter is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const response = await makeRequest({languageCode: 12345}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    test<TestContext>("If user is not logged in return 401", async () => {
        const response = await makeRequest();
        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const response = await makeRequest({}, session.token);
        expect(response.statusCode).to.equal(403);
    });
});
