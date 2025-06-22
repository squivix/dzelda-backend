import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {buildQueryString, createComparator, fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {randomCase} from "@/test/utils.js";
import {faker} from "@faker-js/faker";
import {vocabSerializer} from "@/src/presentation/response/serializers/Vocab/VocabSerializer.js";

/**{@link VocabController#getVocabs}*/
describe("GET vocabs/", () => {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `vocabs/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const queryDefaults = {pagination: {pageSize: 25, page: 1}};
    const defaultSortComparator = createComparator(Vocab, [
        {property: "text", order: "asc"},
        {property: "id", order: "asc"}]
    );
    test<TestContext>("If there are no filters return all vocabs paginated", async (context) => {
        const language = await context.languageFactory.createOne();
        const expectedVocabs = await context.vocabFactory.create(5, {language});
        expectedVocabs.sort(defaultSortComparator);
        const response = await makeRequest({});
        const recordsCount = expectedVocabs.length;

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: vocabSerializer.serializeList(expectedVocabs)
        });
    });
    describe("test filters", () => {
        describe("test languageCode filter", () => {
            test<TestContext>("If language filter is valid and language exists only return vocabs in that language", async (context) => {
                const language1 = await context.languageFactory.createOne();
                const language2 = await context.languageFactory.createOne();
                const expectedVocabs = await context.vocabFactory.create(3, {language: language1});
                await context.vocabFactory.create(3, {language: language2});
                expectedVocabs.sort(defaultSortComparator);

                const response = await makeRequest({languageCode: language1.code});
                const recordsCount = expectedVocabs.length;
                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
            });
            test<TestContext>("If language does not exist return empty vocab list", async (context) => {
                const language = await context.languageFactory.makeOne();
                await context.vocabFactory.create(3, {language: await context.languageFactory.createOne()});

                const response = await makeRequest({languageCode: language.code});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: 0,
                    data: []
                });
            });
            test<TestContext>("If language filter is invalid return 400", async (context) => {
                const response = await makeRequest({languageCode: 12345});

                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test searchQuery filter", () => {
            test<TestContext>("If searchQuery is valid return vocabs with text that matches query", async (context) => {
                const language = await context.languageFactory.createOne();
                const searchQuery = "search query";
                const expectedVocabs: Vocab[] = [];
                for (let i = 0; i < 3; i++) {
                    expectedVocabs.push(context.vocabFactory.makeOne({
                        language: language,
                        text: `text ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`,
                    }));
                }
                await context.em.persistAndFlush(expectedVocabs);
                expectedVocabs.sort(defaultSortComparator);
                await context.vocabFactory.create(3, {language: language});
                const response = await makeRequest({searchQuery: searchQuery});

                const recordsCount = expectedVocabs.length;
                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
            })
            ;
            test<TestContext>("If no vocabs match search query return empty list", async (context) => {
                await context.vocabFactory.create(5, {language: await context.languageFactory.createOne()});

                const response = await makeRequest({searchQuery: faker.random.alpha({count: 200})});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: 0,
                    data: []
                });
            });
            test<TestContext>("If searchQuery is invalid return 400", async (context) => {
                const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})});

                expect(response.statusCode).to.equal(400);
            });
        });
    });
    describe("test sort", () => {
        describe("test sortBy", () => {
            test<TestContext>("test sortBy title", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedVocabs = [
                    await context.vocabFactory.createOne({text: "abc", language}),
                    await context.vocabFactory.createOne({text: "def", language}),
                ];
                const response = await makeRequest({sortBy: "text"});

                const recordsCount = expectedVocabs.length;

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
            });
            test<TestContext>("test sortBy learnersCount", async (context) => {
                const learner1 = await context.userFactory.createOne();
                const learner2 = await context.userFactory.createOne();
                const language = await context.languageFactory.createOne();
                const expectedVocabs = [
                    await context.vocabFactory.createOne({language, learners: [learner1.profile]}),
                    await context.vocabFactory.createOne({language, learners: [learner1.profile, learner2.profile]})
                ];

                const response = await makeRequest({sortBy: "learnersCount"});
                const recordsCount = expectedVocabs.length;

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
            });
            test<TestContext>("test sortBy textsCount", async (context) => {
                const language = await context.languageFactory.createOne();
                const text1 = await context.textFactory.createOne({language});
                const text2 = await context.textFactory.createOne({language});
                const expectedVocabs = [
                    await context.vocabFactory.createOne({language, textsAppearingIn: [text1]}),
                    await context.vocabFactory.createOne({language, textsAppearingIn: [text1, text2]}),
                ];
                const response = await makeRequest({sortBy: "textsCount"});

                const recordsCount = expectedVocabs.length;

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
            });
            test<TestContext>("If sortBy is invalid return 400", async (context) => {
                const response = await makeRequest({sortBy: "popularity"});
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<TestContext>("If sortOrder is asc return the vocabs in ascending order", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedVocabs = [
                    await context.vocabFactory.createOne({text: "abc", language}),
                    await context.vocabFactory.createOne({text: "def", language}),
                ];
                const response = await makeRequest({sortOrder: "asc"});

                const recordsCount = expectedVocabs.length;

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
            });
            test<TestContext>("If sortOrder is desc return the vocabs in descending order", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedVocabs = [
                    await context.vocabFactory.createOne({text: "def", language}),
                    await context.vocabFactory.createOne({text: "abc", language}),
                ];
                const response = await makeRequest({sortOrder: "desc"});

                const recordsCount = expectedVocabs.length;

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
            });
            test<TestContext>("If sortOrder is invalid return 400", async (context) => {
                const response = await makeRequest({sortOrder: "rising"});
                expect(response.statusCode).to.equal(400);
            });
        });
    });
    describe("test pagination", () => {
        describe("test page", () => {
            test<TestContext>("If page is 1 return the first page of results", async (context) => {
                const language = await context.languageFactory.createOne();
                const allVocabs = await context.vocabFactory.create(20, {language});
                allVocabs.sort(defaultSortComparator);
                const recordsCount = allVocabs.length;
                const page = 1, pageSize = 3;
                const expectedVocabs = allVocabs.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
                expect(response.json().data.length).toBeLessThanOrEqual(pageSize);
            });
            test<TestContext>("If page is 2 return the second page of results", async (context) => {
                const language = await context.languageFactory.createOne();
                const allVocabs = await context.vocabFactory.create(20, {language});
                allVocabs.sort(defaultSortComparator);
                const recordsCount = allVocabs.length;
                const page = 2, pageSize = 3;
                const expectedVocabs = allVocabs.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
                expect(response.json().data.length).toBeLessThanOrEqual(pageSize);
            });
            test<TestContext>("If page is last return the last page of results", async (context) => {
                const language = await context.languageFactory.createOne();
                const allVocabs = await context.vocabFactory.create(20, {language});
                allVocabs.sort(defaultSortComparator);
                const recordsCount = allVocabs.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedVocabs = allVocabs.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
                expect(response.json().data.length).toBeLessThanOrEqual(pageSize);
            });
            test<TestContext>("If page is more than last return empty page", async (context) => {
                const language = await context.languageFactory.createOne();
                const allVocabs = await context.vocabFactory.create(20, {language});
                allVocabs.sort(defaultSortComparator);
                const recordsCount = allVocabs.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize) + 1;

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: []
                });
            });
            describe("If page is invalid return 400", () => {
                test<TestContext>("If page is less than 1 return 400", async (context) => {
                    const response = await makeRequest({page: 0, pageSize: 3});

                    expect(response.statusCode).to.equal(400);
                });
                test<TestContext>("If page is not a number return 400", async (context) => {
                    const response = await makeRequest({page: "last", pageSize: 3});

                    expect(response.statusCode).to.equal(400);
                });
            });
        });
        describe("test pageSize", () => {
            test<TestContext>("If pageSize is valid split the results into pageSize sized pages", async (context) => {
                const language = await context.languageFactory.createOne();
                const allVocabs = await context.vocabFactory.create(25, {language});
                allVocabs.sort(defaultSortComparator);
                const recordsCount = allVocabs.length;
                const pageSize = 10;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedVocabs = allVocabs.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
                expect(response.json().data.length).toBeLessThanOrEqual(pageSize);
            });
            describe("If pageSize is invalid return 400", () => {
                test<TestContext>("If pageSize is too big return 400", async (context) => {
                    const response = await makeRequest({page: 1, pageSize: 500});

                    expect(response.statusCode).to.equal(400);
                });
                test<TestContext>("If pageSize is negative return 400", async (context) => {
                    const response = await makeRequest({page: 1, pageSize: -10});

                    expect(response.statusCode).to.equal(400);
                });
                test<TestContext>("If pageSize is not a number return 400", async (context) => {
                    const response = await makeRequest({page: 1, pageSize: "a lot"});

                    expect(response.statusCode).to.equal(400);
                });
            });
        });
    });
});
