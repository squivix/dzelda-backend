import {beforeEach, describe, expect, test, TestContext} from "vitest";
import {LanguageFactory} from "@/src/seeders/factories/LanguageFactory.js";
import {VocabFactory} from "@/src/seeders/factories/VocabFactory.js";
import {EntityRepository} from "@mikro-orm/core";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {orm} from "@/src/server.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";
import {InjectOptions} from "light-my-request";
import {buildQueryString, createComparator, fetchRequest} from "@/tests/integration/utils.js";
import {MeaningFactory} from "@/src/seeders/factories/MeaningFactory.js";
import {meaningSerializer} from "@/src/presentation/response/serializers/entities/MeaningSerializer.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {faker} from "@faker-js/faker";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";

interface LocalTestContext extends TestContext {
    languageFactory: LanguageFactory;
    vocabFactory: VocabFactory;
    meaningFactory: MeaningFactory;
    vocabRepo: EntityRepository<Vocab>;
    meaningRepo: EntityRepository<Meaning>;

}

beforeEach<LocalTestContext>(async (context) => {
    await orm.getSchemaGenerator().clearDatabase();
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.profileFactory = new ProfileFactory(context.em);
    context.sessionFactory = new SessionFactory(context.em);
    context.languageFactory = new LanguageFactory(context.em);
    context.vocabFactory = new VocabFactory(context.em);
    context.meaningFactory = new MeaningFactory(context.em);

    context.vocabRepo = context.em.getRepository(Vocab);
    context.meaningRepo = context.em.getRepository(Meaning);
});

/**{@link MeaningController#createMeaning}*/
describe("POST meanings/", () => {
    const makeRequest = async (body: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `meanings/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };
    test<LocalTestContext>("If user is logged in and all fields are valid create a new meaning and return it", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const vocab = await context.vocabFactory.createOne({language: language});
        const newMeaning = context.meaningFactory.makeOne({language: language, vocab: vocab, addedBy: user.profile, learnersCount: 0});

        const response = await makeRequest({
            languageCode: language.code,
            text: newMeaning.text,
            vocabId: vocab.id
        }, session.token);

        expect(response.statusCode).toEqual(201);
        expect(response.json()).toMatchObject(meaningSerializer.serialize(newMeaning, {ignore: ["addedOn"]}));
        const dbRecord = await context.meaningRepo.findOne({text: newMeaning.text, language, vocab});
        expect(dbRecord).not.toBeNull();
        if (dbRecord != null) {
            expect(meaningSerializer.serialize(dbRecord)).toMatchObject(meaningSerializer.serialize(newMeaning, {ignore: ["addedOn"]}));
        }
    });
    test<LocalTestContext>("If meaning with same text and language for same vocab already exists return 200", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const vocab = await context.vocabFactory.createOne({language: language});

        const meaningData = context.meaningFactory.makeOne({language: language, vocab: vocab, addedBy: user.profile, learnersCount: 0});
        const existingMeaning = await context.meaningFactory.createOne({
            text: meaningData.text, language, vocab,
            addedBy: user.profile, learnersCount: 0
        });

        const response = await makeRequest({
            languageCode: language.code,
            text: meaningData.text,
            vocabId: vocab.id
        }, session.token);

        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual(expect.objectContaining(meaningSerializer.serialize(existingMeaning)));
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const vocab = await context.vocabFactory.createOne({language: language});
        const newMeaning = context.meaningFactory.makeOne({language: language, vocab: vocab, addedBy: user.profile});
        const response = await makeRequest({
            languageCode: language.code,
            text: newMeaning.text,
            vocabId: vocab.id
        });

        expect(response.statusCode).toEqual(401);
    });
    describe("If fields are missing return 400", () => {
        test<LocalTestContext>("If languageCode is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const vocab = await context.vocabFactory.createOne({language: language});
            const newMeaning = context.meaningFactory.makeOne({language: language, vocab: vocab, addedBy: user.profile});
            const response = await makeRequest({
                text: newMeaning.text,
                vocabId: vocab.id
            }, session.token);

            expect(response.statusCode).toEqual(400);
        });
        test<LocalTestContext>("If text is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const vocab = await context.vocabFactory.createOne({language: language});
            const newMeaning = context.meaningFactory.makeOne({language: language, vocab: vocab, addedBy: user.profile});
            const response = await makeRequest({
                languageCode: language.code,
                vocabId: vocab.id
            }, session.token);

            expect(response.statusCode).toEqual(400);
        });
        test<LocalTestContext>("If vocabId is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const vocab = await context.vocabFactory.createOne({language: language});
            const newMeaning = context.meaningFactory.makeOne({language: language, vocab: vocab, addedBy: user.profile});
            const response = await makeRequest({
                languageCode: language.code,
                text: newMeaning.text
            }, session.token);

            expect(response.statusCode).toEqual(400);
        });
    });
    describe("If fields are invalid return 400", () => {
        describe("If language is invalid return 400", async () => {
            test<LocalTestContext>("If languageCode is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language: language});
                const newMeaning = context.meaningFactory.makeOne({language: language, vocab: vocab, addedBy: user.profile});
                const response = await makeRequest({
                    languageCode: faker.random.alphaNumeric(10),
                    text: newMeaning.text,
                    vocabId: vocab.id
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
            test<LocalTestContext>("If language does not exist return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language: language});
                const newMeaning = context.meaningFactory.makeOne({language: language, vocab: vocab, addedBy: user.profile});
                const response = await makeRequest({
                    languageCode: faker.random.alphaNumeric(2),
                    text: newMeaning.text,
                    vocabId: vocab.id
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
        });
        test<LocalTestContext>("If text is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const vocab = await context.vocabFactory.createOne({language: language});
            const response = await makeRequest({
                languageCode: language.code,
                text: faker.random.alpha(1100),
                vocabId: vocab.id
            }, session.token);

            expect(response.statusCode).toEqual(400);
        });
        describe("If vocab is invalid return 400", async () => {
            test<LocalTestContext>("If vocabId is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language: language});
                const newMeaning = context.meaningFactory.makeOne({language: language, vocab: vocab, addedBy: user.profile});
                const response = await makeRequest({
                    languageCode: language.code,
                    text: newMeaning.text,
                    vocabId: faker.random.alpha(3)
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
            test<LocalTestContext>("If vocab does not exist return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language: language});
                const newMeaning = context.meaningFactory.makeOne({language: language, vocab: vocab, addedBy: user.profile});
                const response = await makeRequest({
                    languageCode: language.code,
                    text: newMeaning.text,
                    vocabId: faker.datatype.number({min: 100000})
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
        });
    });
});

/**{@link MeaningController#getUserMeanings}*/
describe("GET users/:username/meanings/", () => {
    const makeRequest = async (username: string | "me", queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/${username}/meanings/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const queryDefaults = {pagination: {pageSize: 10, page: 1}};
    // TODO allow sorting by multiple columns and make learnersCount desc, text asc, id asc the default
    const defaultSortComparator = createComparator(Meaning, [
        {property: "text", order: "asc"},
        {property: "id", order: "asc"}]
    );

    describe("If user is logged in and there are no filters return meanings the user is learning", () => {
        test<LocalTestContext>("If username is me", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const vocab = await context.vocabFactory.createOne({language});
            const expectedMeanings = await context.meaningFactory.create(5, {vocab, language, learners: user.profile});
            await context.meaningFactory.create(5, {vocab, language});
            expectedMeanings.sort(defaultSortComparator);
            const recordsCount = expectedMeanings.length;

            const response = await makeRequest("me", {}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: meaningSerializer.serializeList(expectedMeanings)
            });
        });
        test<LocalTestContext>("If username belongs to the currently logged in user", async (context) => {
            const user = await context.userFactory.createOne();
            const otherUser = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const vocab = await context.vocabFactory.createOne({language});
            const expectedMeanings = await context.meaningFactory.create(5, {vocab, language, addedBy: otherUser.profile, learners: user.profile});
            await context.meaningFactory.create(5, {vocab, language, addedBy: otherUser.profile});
            expectedMeanings.sort(defaultSortComparator);
            const recordsCount = expectedMeanings.length;

            const response = await makeRequest(user.username, {}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: meaningSerializer.serializeList(expectedMeanings)
            });
        });
    });
    describe("test filters", () => {
        describe("test vocab filter", () => {
            test<LocalTestContext>("If vocab filter is valid return only meanings for that vocab", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const vocab1 = await context.vocabFactory.createOne({language});
                const vocab2 = await context.vocabFactory.createOne({language});
                const expectedMeanings = await context.meaningFactory.create(5, {vocab: vocab1, language, learners: [user.profile]});
                await context.meaningFactory.create(5, {vocab: vocab2, language, learners: [user.profile]});
                await context.meaningFactory.create(5, {vocab: vocab1, language});
                await context.meaningFactory.create(5, {vocab: vocab2, language});
                expectedMeanings.sort(defaultSortComparator);
                const recordsCount = expectedMeanings.length;

                const response = await makeRequest("me", {vocabId: vocab1.id}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: meaningSerializer.serializeList(expectedMeanings)
                });
            });
            test<LocalTestContext>("If the user is not meanings for that vocab return empty list", async (context) => {
                const user = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const vocab1 = await context.vocabFactory.createOne({language});
                const vocab2 = await context.vocabFactory.createOne({language});
                await context.meaningFactory.create(5, {vocab: vocab2, language, addedBy: otherUser.profile, learners: user.profile,});
                await context.meaningFactory.create(5, {vocab: vocab1, language, addedBy: otherUser.profile});
                await context.meaningFactory.create(5, {vocab: vocab2, language, addedBy: otherUser.profile});

                const response = await makeRequest("me", {vocabId: vocab1.id}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: 0,
                    data: []
                });
            });
            test<LocalTestContext>("If vocab filter is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});

                const response = await makeRequest("me", {vocabId: "all"}, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
    });
    describe("test sort", () => {
        describe("test sortBy", () => {
            test<LocalTestContext>("test sortBy text", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});
                const expectedMeanings = [
                    await context.meaningFactory.createOne({text: "abc", vocab, language, learners: user.profile}),
                    await context.meaningFactory.createOne({text: "def", vocab, language, learners: user.profile}),
                ];
                await context.meaningFactory.create(5, {vocab, language});
                const recordsCount = expectedMeanings.length;

                const response = await makeRequest("me", {sortBy: "text"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: meaningSerializer.serializeList(expectedMeanings)
                });
            });
            test<LocalTestContext>("test sortBy learnersCount", async (context) => {
                const user = await context.userFactory.createOne();
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});
                const expectedMeanings = [
                    await context.meaningFactory.createOne({vocab, language, learners: [user.profile]}),
                    await context.meaningFactory.createOne({vocab, language, learners: [user.profile, user1.profile]}),
                    await context.meaningFactory.createOne({vocab, language, learners: [user.profile, user1.profile, user2.profile]}),
                ];
                await context.meaningFactory.create(5, {vocab, language});
                const recordsCount = expectedMeanings.length;

                const response = await makeRequest("me", {sortBy: "learnersCount"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: meaningSerializer.serializeList(expectedMeanings)
                });
            });
            test<LocalTestContext>("If sortBy is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const response = await makeRequest("me", {sortBy: "popularity"}, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<LocalTestContext>("If sortOrder is asc return the vocabs in ascending order", async (context) => {
                const user = await context.userFactory.createOne();
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});
                const expectedMeanings = [
                    await context.meaningFactory.createOne({text: "abc", vocab, language, learners: user.profile}),
                    await context.meaningFactory.createOne({text: "def", vocab, language, learners: user.profile}),
                ];
                await context.meaningFactory.create(5, {vocab, language});
                const recordsCount = expectedMeanings.length;

                const response = await makeRequest("me", {sortOrder: "asc"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: meaningSerializer.serializeList(expectedMeanings)
                });
            });
            test<LocalTestContext>("If sortOrder is desc return the vocabs in descending order", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});
                const expectedMeanings = [
                    await context.meaningFactory.createOne({text: "def", vocab, language, learners: user.profile}),
                    await context.meaningFactory.createOne({text: "abc", vocab, language, learners: user.profile}),
                ];
                await context.meaningFactory.create(5, {vocab, language});
                const recordsCount = expectedMeanings.length;

                const response = await makeRequest("me", {sortOrder: "desc"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: meaningSerializer.serializeList(expectedMeanings)
                });
            });
            test<LocalTestContext>("If sortOrder is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const response = await makeRequest("me", {sortOrder: "rising"}, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
    });
    describe("test pagination", () => {
        describe("test page", () => {
            test<LocalTestContext>("If page is 1 return the first page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});
                const allMeanings = await context.meaningFactory.create(10, {vocab, language, learners: user.profile});
                await context.meaningFactory.create(5, {vocab, language});
                allMeanings.sort(defaultSortComparator);
                const recordsCount = allMeanings.length;
                const page = 1, pageSize = 3;
                const expectedMeanings = allMeanings.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest("me", {page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: meaningSerializer.serializeList(expectedMeanings)
                });
            });
            test<LocalTestContext>("If page is 2 return the second page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});
                const allMeanings = await context.meaningFactory.create(10, {vocab, language, learners: user.profile});
                await context.meaningFactory.create(5, {vocab, language});
                allMeanings.sort(defaultSortComparator);
                const recordsCount = allMeanings.length;
                const page = 2, pageSize = 3;
                const expectedMeanings = allMeanings.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest("me", {page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: meaningSerializer.serializeList(expectedMeanings)
                });
            });
            test<LocalTestContext>("If page is last return the last page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});
                const allMeanings = await context.meaningFactory.create(10, {vocab, language, learners: user.profile});
                await context.meaningFactory.create(5, {vocab, language});
                allMeanings.sort(defaultSortComparator);
                const recordsCount = allMeanings.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedMeanings = allMeanings.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest("me", {page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: meaningSerializer.serializeList(expectedMeanings)
                });
            });
            test<LocalTestContext>("If page is more than last return empty page", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});
                const allMeanings = await context.meaningFactory.create(10, {vocab, language, learners: user.profile});
                await context.meaningFactory.create(5, {vocab, language});
                allMeanings.sort(defaultSortComparator);
                const recordsCount = allMeanings.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize) + 1;

                const response = await makeRequest("me", {page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: []
                });
            });
            describe("If page is invalid return 400", () => {
                test<LocalTestContext>("If page is less than 1 return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest("me", {page: 0, pageSize: 3}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If page is not a number return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest("me", {page: "last", pageSize: 3}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
            });
        });
        describe("test pageSize", () => {
            test<LocalTestContext>("If pageSize is 10 split the results into 10 sized pages", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});
                const allMeanings = await context.meaningFactory.create(50, {vocab, language, learners: user.profile});
                await context.meaningFactory.create(5, {vocab, language});
                allMeanings.sort(defaultSortComparator);
                const recordsCount = allMeanings.length;
                const pageSize = 20;
                const page = Math.ceil(recordsCount / pageSize) + 1;
                const expectedMeanings = allMeanings.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest("me", {page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: meaningSerializer.serializeList(expectedMeanings)
                });
            });
            describe("If pageSize is invalid return 400", () => {
                test<LocalTestContext>("If pageSize is too big return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest("me", {page: 1, pageSize: 75}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If pageSize is negative return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest("me", {page: 1, pageSize: -10}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If pageSize is not a number return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest("me", {page: 1, pageSize: "a lot"}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
            });
        });
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const response = await makeRequest("me", {});
        expect(response.statusCode).toEqual(401);
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

/**{@link MeaningController#addMeaningToUser}*/
describe("POST users/:username/meanings/", () => {
    const makeRequest = async (username: string | "me", body: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `users/${username}/meanings/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };

    describe("If the meaning exists and user is learning meaning vocab language add meaning to user's meanings learning", () => {
        test<LocalTestContext>("If username is me", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const vocab = await context.vocabFactory.createOne({language});
            const meaning = await context.meaningFactory.createOne({vocab, language});
            const oldLearnersCount = meaning.learnersCount;

            const response = await makeRequest("me", {meaningId: meaning.id}, session.token);

            expect(response.statusCode).to.equal(201);
            expect(response.json()).toMatchObject(meaningSerializer.serialize(meaning, {ignore: ["learnersCount"]}));
            expect(await context.em.findOne(MapLearnerMeaning, {learner: user.profile, meaning})).not.toBeNull();
            expect(await meaning.learners.loadCount()).toEqual(oldLearnersCount + 1);
        });
        test<LocalTestContext>("If username is belongs to the current user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const vocab = await context.vocabFactory.createOne({language});
            const meaning = await context.meaningFactory.createOne({vocab, language});
            const oldLearnersCount = meaning.learnersCount;

            const response = await makeRequest(user.username, {meaningId: meaning.id}, session.token);

            expect(response.statusCode).to.equal(201);
            expect(response.json()).toMatchObject(meaningSerializer.serialize(meaning, {ignore: ["learnersCount"]}));
            expect(await context.em.findOne(MapLearnerMeaning, {learner: user.profile, meaning})).not.toBeNull();
            expect(await meaning.learners.loadCount()).toEqual(oldLearnersCount + 1);
        });
    });
    test<LocalTestContext>("If user is already learning meaning return 200", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language});
        const meaning = await context.meaningFactory.createOne({vocab, language, learners: user.profile});

        const response = await makeRequest("me", {meaningId: meaning.id}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(meaningSerializer.serialize(meaning));
    });
    describe("If required fields are missing return 400", function () {
        test<LocalTestContext>("If the meaningId is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const response = await makeRequest("me", {}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 400", function () {
        describe("If the meaning is invalid return 400", async () => {
            test<LocalTestContext>("If the meaningId is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest("me", {meaningId: faker.random.alpha(10)}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If the meaning is not found return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest("me", {meaningId: faker.datatype.number({min: 100000})}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If the meaning vocab is not in a language the user is learning return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});
                const meaning = await context.meaningFactory.createOne({vocab, language, addedBy: otherUser.profile});

                const response = await makeRequest("me", {meaningId: meaning.id}, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
    });
    test<LocalTestContext>("If user is not logged in return 401", async () => {
        const response = await makeRequest("me", {});
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

/**{@link MeaningController#removeMeaningFromUser}*/
describe("DELETE users/:username/meanings/:meaningId/", () => {
    const makeRequest = async (username: string | "me", meaningId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "DELETE",
            url: `users/${username}/meanings/${meaningId}/`,
        };
        return await fetchRequest(options, authToken);
    };

    describe("If user is logged in and is learning meaning delete meaning for user and return 204", async () => {
        test<LocalTestContext>("If username is me return 204", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const vocab = await context.vocabFactory.createOne({language});
            const meaning = await context.meaningFactory.createOne({vocab, language, addedBy: user.profile, learners: user.profile});
            const oldLearnersCount = meaning.learnersCount;

            const response = await makeRequest("me", meaning.id, session.token);

            expect(response.statusCode).to.equal(204);
            expect(await context.em.findOne(MapLearnerMeaning, {learner: user.profile, meaning})).toBeNull();
            expect(await meaning.learners.loadCount()).toEqual(oldLearnersCount - 1);
        });
        test<LocalTestContext>("If username is not me and authenticated as user with username return 204", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const vocab = await context.vocabFactory.createOne({language});
            const meaning = await context.meaningFactory.createOne({vocab, language, addedBy: user.profile, learners: user.profile});
            const oldLearnersCount = meaning.learnersCount;

            const response = await makeRequest(user.username, meaning.id, session.token);

            expect(response.statusCode).to.equal(204);
            expect(await context.em.findOne(MapLearnerMeaning, {learner: user.profile, meaning})).toBeNull();
            expect(await meaning.learners.loadCount()).toEqual(oldLearnersCount - 1);
        });
    });
    test<LocalTestContext>("If user is not learning meaning return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language});
        const meaning = await context.meaningFactory.createOne({vocab, language, addedBy: user.profile});

        const response = await makeRequest("me", meaning.id, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If meaning does not exist return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const response = await makeRequest("me", faker.datatype.number({min: 10000000}), session.token);
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language});
        const meaning = await context.meaningFactory.createOne({vocab, language, addedBy: user.profile, learners: user.profile});
        const response = await makeRequest("me", meaning.id);
        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If username does not exist return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language});
        const meaning = await context.meaningFactory.createOne({vocab, language, addedBy: user.profile, learners: user.profile});

        const response = await makeRequest(faker.random.alphaNumeric(20), meaning.id, session.token);
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>(`If user exists and is not public and not authenticated as user return 404`, async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const otherUser = await context.userFactory.createOne({profile: {isPublic: false}});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language});
        const meaning = await context.meaningFactory.createOne({vocab, language, addedBy: user.profile, learners: user.profile});

        const response = await makeRequest(otherUser.username, meaning.id, session.token);
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>(`If username exists and is public and not authenticated as user return 403`, async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const otherUser = await context.userFactory.createOne({profile: {isPublic: true}});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language});
        const meaning = await context.meaningFactory.createOne({vocab, language, addedBy: user.profile, learners: user.profile});

        const response = await makeRequest(otherUser.username, meaning.id, session.token);
        expect(response.statusCode).to.equal(403);
    });
});
