import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {buildQueryString, createComparator, fetchRequest} from "@/test/integration/utils.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {meaningSerializer} from "@/src/presentation/response/serializers/entities/MeaningSerializer.js";

/**{@link MeaningController#getUserMeanings}*/
describe("GET users/me/meanings/", () => {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/me/meanings/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const queryDefaults = {pagination: {pageSize: 10, page: 1}};
    // TODO allow sorting by multiple columns and make learnersCount desc, text asc, id asc the default
    const defaultSortComparator = createComparator(Meaning, [
        {property: "text", order: "asc"},
        {property: "id", order: "asc"}]
    );

    test<TestContext>("If user is logged in and there are no filters return meanings the user is learning", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const translationLanguage = await context.translationLanguageFactory.createOne();
        const vocab = await context.vocabFactory.createOne({language});
        const expectedMeanings = await context.meaningFactory.create(5, {vocab, language: translationLanguage, learners: user.profile});
        await context.meaningFactory.create(5, {vocab, language: translationLanguage});
        expectedMeanings.sort(defaultSortComparator);
        const recordsCount = expectedMeanings.length;

        const response = await makeRequest({}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: meaningSerializer.serializeList(expectedMeanings)
        });
    });
    describe("test filters", () => {
        describe("test vocab filter", () => {
            test<TestContext>("If vocab filter is valid return only meanings for that vocab", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const translationLanguage = await context.translationLanguageFactory.createOne();
                const vocab1 = await context.vocabFactory.createOne({language});
                const vocab2 = await context.vocabFactory.createOne({language});
                const expectedMeanings = await context.meaningFactory.create(5, {vocab: vocab1, language:translationLanguage, learners: [user.profile]});
                await context.meaningFactory.create(5, {vocab: vocab2, language:translationLanguage, learners: [user.profile]});
                await context.meaningFactory.create(5, {vocab: vocab1, language:translationLanguage});
                await context.meaningFactory.create(5, {vocab: vocab2, language:translationLanguage});
                expectedMeanings.sort(defaultSortComparator);
                const recordsCount = expectedMeanings.length;

                const response = await makeRequest({vocabId: vocab1.id}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: meaningSerializer.serializeList(expectedMeanings)
                });
            });
            test<TestContext>("If the user is not meanings for that vocab return empty list", async (context) => {
                const user = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const translationLanguage = await context.translationLanguageFactory.createOne();
                const vocab1 = await context.vocabFactory.createOne({language});
                const vocab2 = await context.vocabFactory.createOne({language});
                await context.meaningFactory.create(5, {vocab: vocab2, language:translationLanguage, addedBy: otherUser.profile, learners: user.profile,});
                await context.meaningFactory.create(5, {vocab: vocab1, language:translationLanguage, addedBy: otherUser.profile});
                await context.meaningFactory.create(5, {vocab: vocab2, language:translationLanguage, addedBy: otherUser.profile});

                const response = await makeRequest({vocabId: vocab1.id}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: 0,
                    data: []
                });
            });
            test<TestContext>("If vocab filter is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});

                const response = await makeRequest({vocabId: "all"}, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
    });
    describe("test sort", () => {
        describe("test sortBy", () => {
            test<TestContext>("test sortBy text", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const translationLanguage = await context.translationLanguageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});
                const expectedMeanings = [
                    await context.meaningFactory.createOne({text: "abc", vocab, language:translationLanguage, learners: user.profile}),
                    await context.meaningFactory.createOne({text: "def", vocab, language:translationLanguage, learners: user.profile}),
                ];
                await context.meaningFactory.create(5, {vocab, language: translationLanguage});
                const recordsCount = expectedMeanings.length;

                const response = await makeRequest({sortBy: "text"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: meaningSerializer.serializeList(expectedMeanings)
                });
            });
            test<TestContext>("test sortBy learnersCount", async (context) => {
                const user = await context.userFactory.createOne();
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const translationLanguage = await context.translationLanguageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});
                const expectedMeanings = [
                    await context.meaningFactory.createOne({vocab, language: translationLanguage, learners: [user.profile]}),
                    await context.meaningFactory.createOne({vocab, language: translationLanguage, learners: [user.profile, user1.profile]}),
                    await context.meaningFactory.createOne({vocab, language: translationLanguage, learners: [user.profile, user1.profile, user2.profile]}),
                ];
                await context.meaningFactory.create(5, {vocab, language: translationLanguage});
                const recordsCount = expectedMeanings.length;

                const response = await makeRequest({sortBy: "learnersCount"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: meaningSerializer.serializeList(expectedMeanings)
                });
            });
            test<TestContext>("If sortBy is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const response = await makeRequest({sortBy: "popularity"}, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<TestContext>("If sortOrder is asc return the vocabs in ascending order", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const translationLanguage = await context.translationLanguageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});
                const expectedMeanings = [
                    await context.meaningFactory.createOne({text: "abc", vocab, language:translationLanguage, learners: user.profile}),
                    await context.meaningFactory.createOne({text: "def", vocab, language:translationLanguage, learners: user.profile}),
                ];
                await context.meaningFactory.create(5, {vocab, language: translationLanguage});
                const recordsCount = expectedMeanings.length;

                const response = await makeRequest({sortOrder: "asc"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: meaningSerializer.serializeList(expectedMeanings)
                });
            });
            test<TestContext>("If sortOrder is desc return the vocabs in descending order", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const translationLanguage = await context.translationLanguageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});
                const expectedMeanings = [
                    await context.meaningFactory.createOne({text: "def", vocab, language:translationLanguage, learners: user.profile}),
                    await context.meaningFactory.createOne({text: "abc", vocab, language:translationLanguage, learners: user.profile}),
                ];
                await context.meaningFactory.create(5, {vocab, language: translationLanguage});
                const recordsCount = expectedMeanings.length;

                const response = await makeRequest({sortOrder: "desc"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: meaningSerializer.serializeList(expectedMeanings)
                });
            });
            test<TestContext>("If sortOrder is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const response = await makeRequest({sortOrder: "rising"}, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
    });
    describe("test pagination", () => {
        describe("test page", () => {
            test<TestContext>("If page is 1 return the first page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const translationLanguage = await context.translationLanguageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});
                const allMeanings = await context.meaningFactory.create(10, {vocab, language: translationLanguage, learners: user.profile});
                await context.meaningFactory.create(5, {vocab, language: translationLanguage});
                allMeanings.sort(defaultSortComparator);
                const recordsCount = allMeanings.length;
                const page = 1, pageSize = 3;
                const expectedMeanings = allMeanings.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: meaningSerializer.serializeList(expectedMeanings)
                });
            });
            test<TestContext>("If page is 2 return the second page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const translationLanguage = await context.translationLanguageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});
                const allMeanings = await context.meaningFactory.create(10, {vocab, language: translationLanguage, learners: user.profile});
                await context.meaningFactory.create(5, {vocab, language: translationLanguage});
                allMeanings.sort(defaultSortComparator);
                const recordsCount = allMeanings.length;
                const page = 2, pageSize = 3;
                const expectedMeanings = allMeanings.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: meaningSerializer.serializeList(expectedMeanings)
                });
            });
            test<TestContext>("If page is last return the last page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const translationLanguage = await context.translationLanguageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});
                const allMeanings = await context.meaningFactory.create(10, {vocab, language: translationLanguage, learners: user.profile});
                await context.meaningFactory.create(5, {vocab, language: translationLanguage});
                allMeanings.sort(defaultSortComparator);
                const recordsCount = allMeanings.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedMeanings = allMeanings.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: meaningSerializer.serializeList(expectedMeanings)
                });
            });
            test<TestContext>("If page is more than last return empty page", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const translationLanguage = await context.translationLanguageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});
                const allMeanings = await context.meaningFactory.create(10, {vocab, language: translationLanguage, learners: user.profile});
                await context.meaningFactory.create(5, {vocab, language: translationLanguage});
                allMeanings.sort(defaultSortComparator);
                const recordsCount = allMeanings.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize) + 1;

                const response = await makeRequest({page, pageSize}, session.token);

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
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest({page: 0, pageSize: 3}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<TestContext>("If page is not a number return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest({page: "last", pageSize: 3}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
            });
        });
        describe("test pageSize", () => {
            test<TestContext>("If pageSize is 10 split the results into 10 sized pages", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const translationLanguage = await context.translationLanguageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});
                const allMeanings = await context.meaningFactory.create(50, {vocab, language: translationLanguage, learners: user.profile});
                await context.meaningFactory.create(5, {vocab, language: translationLanguage});
                allMeanings.sort(defaultSortComparator);
                const recordsCount = allMeanings.length;
                const pageSize = 20;
                const page = Math.ceil(recordsCount / pageSize) + 1;
                const expectedMeanings = allMeanings.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: meaningSerializer.serializeList(expectedMeanings)
                });
            });
            describe("If pageSize is invalid return 400", () => {
                test<TestContext>("If pageSize is too big return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest({page: 1, pageSize: 75}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<TestContext>("If pageSize is negative return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest({page: 1, pageSize: -10}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<TestContext>("If pageSize is not a number return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest({page: 1, pageSize: "a lot"}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
            });
        });
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const response = await makeRequest({});
        expect(response.statusCode).toEqual(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const response = await makeRequest({}, session.token);
        expect(response.statusCode).toEqual(403);
    });
});
