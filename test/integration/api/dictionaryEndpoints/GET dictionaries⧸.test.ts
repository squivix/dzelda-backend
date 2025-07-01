import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {buildQueryString, createComparator, fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {dictionarySerializer} from "@/src/presentation/response/serializers/Dictionary/DictionarySerializer.js";

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
    test<TestContext>("If there are no filters return all dictionaries", async (context) => {
        const language = await context.languageFactory.createOne();
        const expectedDictionaries = await context.dictionaryFactory.create(5, {language});
        expectedDictionaries.sort(defaultSortComparator);

        const response = await makeRequest({});

        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual(dictionarySerializer.serializeList(expectedDictionaries));
    });
    describe("test language filter", () => {
        test<TestContext>("If language filter is valid and language exists only return dictionaries in that language", async (context) => {
            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            const expectedDictionaries = await context.dictionaryFactory.create(5, {language: language1});
            await context.dictionaryFactory.create(5, {language: language2});
            expectedDictionaries.sort(defaultSortComparator);

            const response = await makeRequest({languageCode: language1.code});

            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual(dictionarySerializer.serializeList(expectedDictionaries));
        });
        test<TestContext>("If language does not exist return empty dictionary list", async (context) => {
            const language = await context.languageFactory.makeOne();
            await context.dictionaryFactory.create(5, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({languageCode: language.code});

            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual([]);
        });
        test<TestContext>("If language filter is invalid return 400", async (context) => {
            const response = await makeRequest({languageCode: 12345});
            expect(response.statusCode).toEqual(400);
        });
    });
});
