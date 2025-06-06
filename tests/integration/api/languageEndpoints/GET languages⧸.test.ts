import {describe, expect, test, TestContext} from "vitest";
import {buildQueryString, createComparator, fetchRequest} from "@/tests/integration/utils.js";
import {Language} from "@/src/models/entities/Language.js";
import {languageSerializer} from "@/src/presentation/response/serializers/entities/LanguageSerializer.js";

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

    test<TestContext>("It should return all languages", async (context) => {
        const expectedLanguages = await context.languageFactory.create(10);
        expectedLanguages.sort(defaultSortComparator);

        const response = await makeRequest();

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(languageSerializer.serializeList(expectedLanguages));
    });
    describe("test sort", () => {
        describe("test sortBy", () => {
            test<TestContext>("test sortBy name", async (context) => {
                const expectedLanguages = [
                    await context.languageFactory.createOne({name: "abc"}),
                    await context.languageFactory.createOne({name: "def"}),
                ];

                const response = await makeRequest({sortBy: "name"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(languageSerializer.serializeList(expectedLanguages));
            });
            test<TestContext>("test sortBy learnersCount", async (context) => {
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
            test.todo<TestContext>("test sortBy secondSpeakersCount", async (context) => {});
            test<TestContext>("if sortBy is invalid return 400", async (context) => {
                const response = await makeRequest({sortBy: "flag"});
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<TestContext>("If sortOrder is asc return the languages in ascending order", async (context) => {
                const expectedLanguages = [
                    await context.languageFactory.createOne({name: "abc"}),
                    await context.languageFactory.createOne({name: "def"}),
                ];

                const response = await makeRequest({sortOrder: "asc"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(languageSerializer.serializeList(expectedLanguages));
            });
            test<TestContext>("If sortOrder is desc return the languages in descending order", async (context) => {
                const expectedLanguages = [
                    await context.languageFactory.createOne({name: "def"}),
                    await context.languageFactory.createOne({name: "abc"}),
                ];

                const response = await makeRequest({sortOrder: "desc"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(languageSerializer.serializeList(expectedLanguages));
            });
            test<TestContext>("If sortOrder is invalid return 400", async (context) => {
                const response = await makeRequest({sortOrder: "rising"});
                expect(response.statusCode).to.equal(400);
            });
        });
    });
});
