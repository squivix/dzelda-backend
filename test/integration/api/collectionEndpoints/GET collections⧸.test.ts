import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {buildQueryString, createComparator, fetchRequest} from "@/test/integration/utils.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {collectionSerializer} from "@/src/presentation/response/serializers/entities/CollectionSerializer.js";
import {faker} from "@faker-js/faker";
import {randomCase} from "@/test/utils.js";

/**{@link CollectionController#getCollections}*/
describe("GET collections/", function () {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `collections/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const queryDefaults = {pagination: {pageSize: 10, page: 1}};
    const defaultSortComparator = createComparator(Collection, [
        {property: "title", order: "asc"},
        {property: "id", order: "asc"}]
    );
    test<TestContext>("If there are no filters return all public collections", async (context) => {
        const language = await context.languageFactory.createOne();
        await context.collectionFactory.create(5, {language, isPublic: false});
        const expectedCollection = await context.collectionFactory.create(5, {language});
        expectedCollection.sort(defaultSortComparator);
        const recordsCount = expectedCollection.length;

        const response = await makeRequest();

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: collectionSerializer.serializeList(expectedCollection)
        });
    });
    describe("test languageCode filter", () => {
        test<TestContext>("If language filter is valid and language exists only return public collections in that language", async (context) => {
            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            await context.collectionFactory.create(5, {language: language1, isPublic: false});
            const expectedCollections = await context.collectionFactory.create(3, {language: language1});
            await context.collectionFactory.create(3, {language: language2});
            expectedCollections.sort(defaultSortComparator);
            const recordsCount = expectedCollections.length;

            const response = await makeRequest({languageCode: language1.code});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: collectionSerializer.serializeList(expectedCollections)
            });
        });
        test<TestContext>("If language does not exist return empty list", async (context) => {
            await context.collectionFactory.create(3, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({languageCode: faker.random.alpha({count: 4})});
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
    describe("test addedBy filter", () => {
        test<TestContext>("If addedBy filter is valid and user exists only return public collections added by that user", async (context) => {
            const user1 = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const expectedCollections = await context.collectionFactory.create(3, {language, addedBy: user1.profile});
            await context.collectionFactory.create(3, {language});
            expectedCollections.sort(defaultSortComparator);
            const recordsCount = expectedCollections.length;

            const response = await makeRequest({addedBy: user1.username});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: collectionSerializer.serializeList(expectedCollections)
            });
        });
        test<TestContext>("If addedBy is me and signed in return collections added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const expectedCollections = await context.collectionFactory.create(6, {language, addedBy: user.profile});
            await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
            await context.collectionFactory.create(3, {language});

            expectedCollections.sort(defaultSortComparator);
            const recordsCount = expectedCollections.length;

            const response = await makeRequest({addedBy: "me"}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: collectionSerializer.serializeList(expectedCollections)
            });
        });
        test<TestContext>("If addedBy is me and not signed in return 401", async (context) => {
            const response = await makeRequest({addedBy: "me"});
            expect(response.statusCode).to.equal(401);
        });
        test<TestContext>("If user does not exist return empty list", async (context) => {
            await context.collectionFactory.create(3, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({addedBy: faker.random.alpha({count: 20})});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: 0,
                data: []
            });
        });
        test<TestContext>("If addedBy filter is invalid return 400", async (context) => {
            const response = await makeRequest({addedBy: ""});
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test searchQuery filter", () => {
        test<TestContext>("If searchQuery is valid return collections with query in title or description", async (context) => {
            const language = await context.languageFactory.createOne();
            const searchQuery = "search query";
            const expectedCollections = [
                await context.collectionFactory.createOne({
                    language,
                    title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`
                }),
                await context.collectionFactory.createOne({
                    language,
                    description: `description ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`
                })
            ];
            await context.collectionFactory.create(3, {language, isPublic: false});
            await context.collectionFactory.create(3, {language: language});
            expectedCollections.sort(defaultSortComparator);
            const recordsCount = expectedCollections.length;

            const response = await makeRequest({searchQuery: searchQuery});
            expect(response.statusCode).to.equal(200);

            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: collectionSerializer.serializeList(expectedCollections)
            });
        });
        test<TestContext>("If searchQuery is invalid return 400", async (context) => {
            const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})});

            expect(response.statusCode).to.equal(400);
        });
        test<TestContext>("If no collections match search query return empty list", async (context) => {
            await context.collectionFactory.create(3, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({searchQuery: faker.random.alpha({count: 200})});

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
            test<TestContext>("test sortBy title", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedCollections = [
                    await context.collectionFactory.createOne({title: "abc", language}),
                    await context.collectionFactory.createOne({title: "def", language})
                ];
                const recordsCount = expectedCollections.length;

                const response = await makeRequest({sortBy: "title"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<TestContext>("test sortBy createdDate", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedCollections = [
                    await context.collectionFactory.createOne({
                        addedOn: new Date("2018-07-22T10:30:45.000Z"),
                        language
                    }),
                    await context.collectionFactory.createOne({
                        addedOn: new Date("2023-03-15T20:29:42.000Z"),
                        language
                    }),
                ];
                const recordsCount = expectedCollections.length;

                const response = await makeRequest({sortBy: "createdDate"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<TestContext>("test sortBy avgPastViewersCountPerText", async (context) => {
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();

                const language = await context.languageFactory.createOne();
                const expectedCollections = [
                    await context.collectionFactory.createOne({language, texts: []}),
                    await context.collectionFactory.createOne({
                        language,
                        texts: [context.textFactory.makeOne({language, pastViewers: []})]
                    }),
                    await context.collectionFactory.createOne({
                        language,
                        texts: [context.textFactory.makeOne({language, pastViewers: [user1.profile]})]
                    }),
                    await context.collectionFactory.createOne({
                        language,
                        texts: [context.textFactory.makeOne({language, pastViewers: [user1.profile, user2.profile]})]
                    }),
                ];
                const recordsCount = expectedCollections.length;

                const response = await makeRequest({sortBy: "avgPastViewersCountPerText"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<TestContext>("if sortBy is invalid return 400", async (context) => {
                const response = await makeRequest({sortBy: "something"});
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<TestContext>("test sortOrder ascending", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedCollections = [
                    await context.collectionFactory.createOne({title: "abc", language}),
                    await context.collectionFactory.createOne({title: "def", language})
                ];
                const recordsCount = expectedCollections.length;

                const response = await makeRequest({sortOrder: "asc"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<TestContext>("test sortOrder descending", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedCollections = [
                    await context.collectionFactory.createOne({title: "def", language}),
                    await context.collectionFactory.createOne({title: "abc", language}),
                ];
                const recordsCount = expectedCollections.length;

                const response = await makeRequest({sortOrder: "desc"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<TestContext>("if sortBy is invalid return 400", async (context) => {
                const response = await makeRequest({sortOrder: "rising"});
                expect(response.statusCode).to.equal(400);
            });
        });
    });
    describe("test pagination", () => {
        describe("test page", () => {
            test<TestContext>("If page is 1 return the first page of results", async (context) => {
                const allCollections = await context.collectionFactory.create(10, {language: await context.languageFactory.createOne()});
                allCollections.sort(defaultSortComparator);
                const recordsCount = allCollections.length;
                const page = 1, pageSize = 3;
                const expectedCollections = allCollections.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<TestContext>("If page is 2 return the second page of results", async (context) => {
                const allCollections = await context.collectionFactory.create(10, {language: await context.languageFactory.createOne()});
                allCollections.sort(defaultSortComparator);
                const recordsCount = allCollections.length;
                const page = 2, pageSize = 3;
                const expectedCollections = allCollections.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<TestContext>("If page is last return the last page of results", async (context) => {
                const allCollections = await context.collectionFactory.create(10, {language: await context.languageFactory.createOne()});
                allCollections.sort(defaultSortComparator);
                const recordsCount = allCollections.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedCollections = allCollections.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<TestContext>("If page is more than last return empty page", async (context) => {
                const allCollections = await context.collectionFactory.create(10, {language: await context.languageFactory.createOne()});
                const recordsCount = allCollections.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize) + 1;
                const expectedCollections = allCollections.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

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
            test<TestContext>("If pageSize is 20 split the results into 20 sized pages", async (context) => {
                const language = await context.languageFactory.createOne();
                const allCollections = await context.collectionFactory.create(50, {language});
                allCollections.sort(defaultSortComparator);
                const recordsCount = allCollections.length;
                const page = 2, pageSize = 20;
                const expectedCollections = allCollections.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
                expect(response.json().data.length).toBeLessThanOrEqual(pageSize);
            });
            describe("If pageSize is invalid return 400", () => {
                test<TestContext>("If pageSize is too big return 400", async (context) => {
                    const response = await makeRequest({page: 1, pageSize: 250});

                    expect(response.statusCode).to.equal(400);
                });
                test<TestContext>("If pageSize is negative return 400", async (context) => {
                    const response = await makeRequest({page: 1, pageSize: -20});

                    expect(response.statusCode).to.equal(400);
                });
                test<TestContext>("If pageSize is not a number return 400", async (context) => {
                    const response = await makeRequest({page: 1, pageSize: "a lot"});

                    expect(response.statusCode).to.equal(400);
                });
            });
        });
    });
    test<TestContext>("If logged in return collections with vocab levels for user", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const expectedCollections = await context.collectionFactory.create(5, {language});
        expectedCollections.sort(defaultSortComparator);
        await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
        const recordsCount = expectedCollections.length;

        const response = await makeRequest({}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: collectionSerializer.serializeList(expectedCollections)
        });
    });
    test<TestContext>("If logged in as author of collections return private collections", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        await context.collectionFactory.create(5, {language, isPublic: false})
        const expectedCollections = [
            ...await context.collectionFactory.create(5, {language, isPublic: true}),
            ...await context.collectionFactory.create(5, {language, isPublic: false, addedBy: user.profile}),
        ];
        expectedCollections.sort(defaultSortComparator);
        await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
        const recordsCount = expectedCollections.length;

        const response = await makeRequest({}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: collectionSerializer.serializeList(expectedCollections)
        });
    });
});
