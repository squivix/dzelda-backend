import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {buildQueryString, createComparator, fetchRequest} from "@/tests/integration/utils.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {learnerVocabSerializer} from "@/src/presentation/response/serializers/mappings/LearnerVocabSerializer.js";
import {randomCase, randomEnum, randomEnums} from "@/tests/utils.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {faker} from "@faker-js/faker";

/**{@link VocabController#getUserVocabs}*/
describe("GET users/me/vocabs/", () => {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/me/vocabs/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const queryDefaults = {pagination: {pageSize: 25, page: 1}};
    const defaultSortComparator = createComparator(Vocab, [
        {property: "text", order: "asc"},
        {property: "id", order: "asc"}]
    );
    test<TestContext>("If user is logged in and there are no filters return vocabs the user is learning", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        await context.vocabFactory.create(5, {language});
        const expectedVocabs = await context.vocabFactory.create(5, {language});
        expectedVocabs.sort(defaultSortComparator);
        const expectedMappings = [];
        for (let vocab of expectedVocabs)
            expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
        await context.em.flush();
        const recordsCount = expectedMappings.length;

        const response = await makeRequest({}, session.token);
        await context.em.count(MapLearnerVocab, {learner: user.profile});
        await context.em.find(Vocab, expectedVocabs, {refresh: true});

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: learnerVocabSerializer.serializeList(expectedMappings)
        });
    });
    describe("test languageCode filter", () => {
        test<TestContext>("If language filter is valid and language exists only return vocabs in that language the user is learning", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            const expectedVocabs = await context.vocabFactory.create(3, {language: language1});
            await context.vocabFactory.create(3, {language: language2, learners: user.profile});
            await context.vocabFactory.create(5, {language: language1});
            expectedVocabs.sort(defaultSortComparator);
            const expectedMappings = [];
            for (let vocab of expectedVocabs)
                expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
            await context.em.flush();
            const recordsCount = expectedMappings.length;

            const response = await makeRequest({languageCode: language1.code}, session.token);
            await context.em.find(Vocab, expectedVocabs, {refresh: true});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: learnerVocabSerializer.serializeList(expectedMappings)
            });
        });
        test<TestContext>("If language does not exist return empty vocab list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.makeOne();

            const response = await makeRequest({languageCode: language.code}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: 0,
                data: []
            });
        });
        test<TestContext>("If language filter is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});

            const response = await makeRequest({languageCode: 12345}, session.token);

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test level filter", () => {
        test<TestContext>("If level filter is valid only return vocabs the user is learning with that level", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const level = randomEnum(VocabLevel);
            const expectedVocabs = await context.vocabFactory.create(5, {language});
            for (let vocab of await context.vocabFactory.create(5, {language}))
                context.em.create(MapLearnerVocab, {learner: user.profile, vocab, level: randomEnum(VocabLevel, [level])});
            expectedVocabs.sort(defaultSortComparator);
            const expectedMappings = [];
            for (let vocab of expectedVocabs)
                expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab, level}));
            await context.em.flush();
            const recordsCount = expectedMappings.length;
            const response = await makeRequest({level: level}, session.token);
            await context.em.find(Vocab, expectedVocabs, {refresh: true});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: learnerVocabSerializer.serializeList(expectedMappings)
            });
        });
        test<TestContext>("If multiple levels are sent return vocabs in any of those levels", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const levels = randomEnums(2, VocabLevel);
            const expectedVocabs = await context.vocabFactory.create(1, {language});
            for (let vocab of await context.vocabFactory.create(5, {language}))
                context.em.create(MapLearnerVocab, {learner: user.profile, vocab, level: randomEnum(VocabLevel, levels)});
            expectedVocabs.sort(defaultSortComparator);
            const expectedMappings: MapLearnerVocab[] = [];
            expectedVocabs.forEach(vocab => expectedMappings.push(context.em.create(MapLearnerVocab,
                {learner: user.profile, vocab, level: faker.helpers.arrayElement(levels)}
            )));

            await context.em.flush();
            const recordsCount = expectedMappings.length;
            const response = await makeRequest({level: levels}, session.token);
            await context.em.find(Vocab, expectedVocabs, {refresh: true});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: learnerVocabSerializer.serializeList(expectedMappings)
            });
        });
        test<TestContext>("If level filter is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});

            const response = await makeRequest({level: 7}, session.token);

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test searchQuery filter", () => {
        test<TestContext>("If searchQuery is valid return vocabs with query in text", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const searchQuery = "search query";
            await context.vocabFactory.create(5, {language: language, learners: user.profile});
            const expectedVocabs: Vocab[] = await context.vocabFactory.each(v => v.text = `text ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`).create(5, {language});
            expectedVocabs.sort(defaultSortComparator);
            const expectedMappings = [];
            for (let vocab of expectedVocabs)
                expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
            await context.em.flush();
            const recordsCount = expectedMappings.length;

            const response = await makeRequest({searchQuery: searchQuery}, session.token);
            await context.em.find(Vocab, expectedVocabs, {refresh: true});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: learnerVocabSerializer.serializeList(expectedMappings)
            });
        });
        test<TestContext>("If searchQuery is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});

            const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})}, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<TestContext>("If no vocabs match search query return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            await context.vocabFactory.create(5, {language: language, learners: user.profile});

            const response = await makeRequest({searchQuery: faker.random.alpha({count: 200})}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: 0,
                data: []
            });
        });
    });
    describe("test sort", () => {
        describe("test sortBy", () => {
            test<TestContext>("test sortBy text", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedVocabs = [
                    await context.vocabFactory.createOne({text: "abc", language}),
                    await context.vocabFactory.createOne({text: "def", language}),
                ];
                await context.vocabFactory.createOne({language});
                const expectedMappings = [];
                for (let vocab of expectedVocabs)
                    expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                const recordsCount = expectedMappings.length;

                const response = await makeRequest({sortBy: "text"}, session.token);
                await context.em.find(Vocab, expectedVocabs, {refresh: true});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: learnerVocabSerializer.serializeList(expectedMappings)
                });
            });
            test<TestContext>("test sortBy learnersCount", async (context) => {
                const user = await context.userFactory.createOne();
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedVocabs = [
                    await context.vocabFactory.createOne({language, learners: [user1.profile]}),
                    await context.vocabFactory.createOne({language, learners: [user1.profile, user2.profile]})
                ];
                await context.vocabFactory.createOne({language});
                const expectedMappings = [];
                for (let vocab of expectedVocabs)
                    expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                const recordsCount = expectedMappings.length;


                const response = await makeRequest({sortBy: "learnersCount"}, session.token);
                await context.em.find(Vocab, expectedVocabs, {refresh: true});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: learnerVocabSerializer.serializeList(expectedMappings)
                });
            });
            test<TestContext>("test sortBy textsCount", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const text1 = await context.textFactory.createOne({language});
                const text2 = await context.textFactory.createOne({language});

                const expectedVocabs = [
                    await context.vocabFactory.createOne({language, textsAppearingIn: [text1]}),
                    await context.vocabFactory.createOne({language, textsAppearingIn: [text1, text2]})
                ];
                await context.vocabFactory.createOne({language});
                const expectedMappings = [];
                for (let vocab of expectedVocabs)
                    expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                const recordsCount = expectedMappings.length;

                const response = await makeRequest({sortBy: "textsCount"}, session.token);
                await context.em.find(Vocab, expectedVocabs, {refresh: true});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: learnerVocabSerializer.serializeList(expectedMappings)
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
                const expectedVocabs = [
                    await context.vocabFactory.createOne({language, text: "abc"}),
                    await context.vocabFactory.createOne({language, text: "def"})
                ];
                await context.vocabFactory.createOne({language});
                const expectedMappings = [];
                for (let vocab of expectedVocabs)
                    expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                const recordsCount = expectedMappings.length;

                const response = await makeRequest({sortBy: "text", sortOrder: "asc"}, session.token);
                await context.em.find(Vocab, expectedVocabs, {refresh: true});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: learnerVocabSerializer.serializeList(expectedMappings)
                });
            });
            test<TestContext>("If sortOrder is desc return the vocabs in descending order", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedVocabs = [
                    await context.vocabFactory.createOne({language, text: "def"}),
                    await context.vocabFactory.createOne({language, text: "abc"}),
                ];
                await context.vocabFactory.createOne({language});
                const expectedMappings = [];
                for (let vocab of expectedVocabs)
                    expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                const recordsCount = expectedMappings.length;

                const response = await makeRequest({sortBy: "text", sortOrder: "desc"}, session.token);
                await context.em.find(Vocab, expectedVocabs, {refresh: true});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: learnerVocabSerializer.serializeList(expectedMappings)
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
                const expectedVocabs = await context.vocabFactory.create(10, {language});
                await context.vocabFactory.create(10, {language});
                expectedVocabs.sort(defaultSortComparator);
                const allMappings = [];
                for (let vocab of expectedVocabs)
                    allMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                const recordsCount = allMappings.length;
                const page = 1, pageSize = 3;
                const expectedMappings = allMappings.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize}, session.token);
                await context.em.find(Vocab, expectedVocabs, {refresh: true});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: learnerVocabSerializer.serializeList(expectedMappings)
                });
            });
            test<TestContext>("If page is 2 return the second page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedVocabs = await context.vocabFactory.create(10, {language});
                expectedVocabs.sort(defaultSortComparator);
                const allMappings = [];
                for (let vocab of expectedVocabs)
                    allMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                const recordsCount = allMappings.length;
                await context.vocabFactory.create(10, {language});
                const page = 2, pageSize = 3;
                const expectedMappings = allMappings.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize}, session.token);
                await context.em.find(Vocab, expectedVocabs, {refresh: true});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: learnerVocabSerializer.serializeList(expectedMappings)
                });
            });
            test<TestContext>("If page is last return the last page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedVocabs = await context.vocabFactory.create(10, {language});
                await context.vocabFactory.create(10, {language});
                expectedVocabs.sort(defaultSortComparator);
                const allMappings = [];
                for (let vocab of expectedVocabs)
                    allMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                const recordsCount = allMappings.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedMappings = allMappings.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize}, session.token);
                await context.em.find(Vocab, expectedVocabs, {refresh: true});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: learnerVocabSerializer.serializeList(expectedMappings)
                });
            });
            test<TestContext>("If page is more than last return empty page", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedVocabs = await context.vocabFactory.create(10, {language});
                await context.vocabFactory.create(10, {language});
                expectedVocabs.sort(defaultSortComparator);
                const expectedMappings = [];
                for (let vocab of expectedVocabs)
                    expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                const recordsCount = expectedMappings.length;
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
                const expectedVocabs = await context.vocabFactory.create(10, {language});
                await context.vocabFactory.create(10, {language});
                expectedVocabs.sort(defaultSortComparator);
                const allMappings = [];
                for (let vocab of expectedVocabs)
                    allMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                const recordsCount = allMappings.length;
                const page = 1, pageSize = 10;
                const expectedMappings = allMappings.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize}, session.token);
                await context.em.find(Vocab, expectedVocabs, {refresh: true});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: learnerVocabSerializer.serializeList(expectedMappings)
                });
            });
            describe("If pageSize is invalid return 400", () => {
                test<TestContext>("If pageSize is too big return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest({page: 1, pageSize: 500}, session.token);

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
        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user: user});
        const response = await makeRequest({}, session.token);
        expect(response.statusCode).to.equal(403);
    });
});
