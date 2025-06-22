import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {buildQueryString, createComparator, fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {faker} from "@faker-js/faker";
import {randomCase} from "@/test/utils.js";
import {collectionSummaryLoggedInSerializer} from "@/src/presentation/response/serializers/Collection/CollectionSummaryLoggedInSerializer.js";

/**{@link CollectionController#getUserBookmarkedCollections}*/
describe("GET users/me/collections/bookmarked/", function () {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/me/collections/bookmarked/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const queryDefaults = {pagination: {pageSize: 10, page: 1}};
    const defaultSortComparator = createComparator(Collection, [
        {property: "title", order: "asc"},
        {property: "id", order: "asc"}]
    );
    test<TestContext>("If there are no filters return all public collections user has bookmarked", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const language = await context.languageFactory.createOne();
        const expectedCollections = await context.collectionFactory.create(3, {language, bookmarkers: user.profile});
        await context.collectionFactory.create(3, {language, bookmarkers: user.profile, isPublic: false});
        await context.collectionFactory.create(3, {language});
        await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
        expectedCollections.sort(defaultSortComparator);
        const recordsCount = expectedCollections.length;

        const response = await makeRequest({}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: collectionSummaryLoggedInSerializer.serializeList(expectedCollections)
        });
    });
    describe("test languageCode filter", () => {
        test<TestContext>("If language filter is valid and language exists only return collections in that language that user has bookmarked", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            const expectedCollections = await context.collectionFactory.create(3, {
                language: language1,
                bookmarkers: user.profile
            });
            await context.collectionFactory.create(3, {language: language1, bookmarkers: user.profile, isPublic: false});
            await context.collectionFactory.create(3, {language: language2, bookmarkers: user.profile});
            await context.collectionFactory.create(3, {language: language1});
            await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
            expectedCollections.sort(defaultSortComparator);
            const recordsCount = expectedCollections.length;

            const response = await makeRequest({languageCode: language1.code}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: collectionSummaryLoggedInSerializer.serializeList(expectedCollections)
            });
        });
        test<TestContext>("If language does not exist return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            await context.collectionFactory.create(3, {
                language: await context.languageFactory.createOne(),
                bookmarkers: user.profile
            });

            const response = await makeRequest({languageCode: faker.random.alpha({count: 4})}, session.token);
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
            const session = await context.sessionFactory.createOne({user});
            const response = await makeRequest({languageCode: 12345}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test addedBy filter", () => {
        test<TestContext>("If addedBy filter is valid and user exists only return collections added by that user that current user has bookmarked", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();

            const user1 = await context.userFactory.createOne();
            const user2 = await context.userFactory.createOne();
            const expectedCollections = await context.collectionFactory.create(3, {
                language,
                addedBy: user1.profile,
                bookmarkers: user.profile
            });
            await context.collectionFactory.create(3, {language, addedBy: user2.profile, bookmarkers: user.profile});
            await context.collectionFactory.create(3, {language, addedBy: user1.profile});
            await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
            expectedCollections.sort(defaultSortComparator);
            const recordsCount = expectedCollections.length;

            const response = await makeRequest({addedBy: user1.username}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: collectionSummaryLoggedInSerializer.serializeList(expectedCollections)
            });
        });
        test<TestContext>("If addedBy is me and signed in return collections added by current user that they have bookmarked", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();

            const otherUser = await context.userFactory.createOne();
            const expectedCollections = await context.collectionFactory.create(3, {
                language,
                addedBy: user.profile,
                bookmarkers: user.profile
            });
            await context.collectionFactory.create(3, {
                language,
                addedBy: otherUser.profile,
                bookmarkers: user.profile
            });
            await context.collectionFactory.create(3, {language, addedBy: user.profile});
            await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
            expectedCollections.sort(defaultSortComparator);
            const recordsCount = expectedCollections.length;

            const response = await makeRequest({addedBy: "me"}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: collectionSummaryLoggedInSerializer.serializeList(expectedCollections)
            });
        });
        test<TestContext>("If user does not exist return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            await context.collectionFactory.create(3, {
                language: await context.languageFactory.createOne(),
                bookmarkers: user.profile
            });

            const response = await makeRequest({addedBy: faker.random.alpha({count: 20})}, session.token);
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: 0,
                data: []
            });
        });
        test<TestContext>("If addedBy filter is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const response = await makeRequest({addedBy: ""}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test searchQuery filter", () => {
        test<TestContext>("If searchQuery is valid return collections with query in title or description", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();
            const searchQuery = "search query";
            const expectedCollections = [
                await context.collectionFactory.createOne({
                    language,
                    bookmarkers: user.profile,
                    title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`
                }),
                await context.collectionFactory.createOne({
                    language,
                    bookmarkers: user.profile,
                    description: `description ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`
                })
            ];
            await context.collectionFactory.create(3, {language, bookmarkers: user.profile, isPublic: false, title: searchQuery});
            await context.collectionFactory.create(3, {
                language: language,
                title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`
            });
            await context.collectionFactory.create(3, {
                language: language,
                description: `description ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`
            });
            await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
            expectedCollections.sort(defaultSortComparator);
            const recordsCount = expectedCollections.length;

            const response = await makeRequest({searchQuery: searchQuery}, session.token);
            expect(response.statusCode).to.equal(200);

            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: collectionSummaryLoggedInSerializer.serializeList(expectedCollections)
            });
        });
        test<TestContext>("If searchQuery is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})}, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<TestContext>("If no collections match search query return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            await context.collectionFactory.create(3, {
                language: await context.languageFactory.createOne(),
                bookmarkers: user.profile
            });

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
            test<TestContext>("test sortBy title", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedCollections = [
                    await context.collectionFactory.createOne({title: "abc", bookmarkers: user.profile, language}),
                    await context.collectionFactory.createOne({title: "def", bookmarkers: user.profile, language})
                ];
                await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
                const recordsCount = expectedCollections.length;

                const response = await makeRequest({sortBy: "title"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: collectionSummaryLoggedInSerializer.serializeList(expectedCollections)
                });
            });
            test<TestContext>("test sortBy createdDate", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedCollections = [
                    await context.collectionFactory.createOne({
                        addedOn: new Date("2018-07-22T10:30:45.000Z"),
                        bookmarkers: user.profile,
                        language
                    }),
                    await context.collectionFactory.createOne({
                        addedOn: new Date("2023-03-15T20:29:42.000Z"),
                        bookmarkers: user.profile,
                        language
                    }),
                ];
                await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
                const recordsCount = expectedCollections.length;

                const response = await makeRequest({sortBy: "createdDate"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: collectionSummaryLoggedInSerializer.serializeList(expectedCollections)
                });
            });
            test<TestContext>("test sortBy avgPastViewersCountPerText", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();

                const language = await context.languageFactory.createOne();
                const expectedCollections = [
                    await context.collectionFactory.createOne({language, bookmarkers: user.profile, texts: []}),
                    await context.collectionFactory.createOne({
                        language,
                        bookmarkers: user.profile,
                        texts: [context.textFactory.makeOne({language, pastViewers: []})]
                    }),
                    await context.collectionFactory.createOne({
                        language,
                        bookmarkers: user.profile,
                        texts: [context.textFactory.makeOne({language, pastViewers: [user1.profile]})]
                    }),
                    await context.collectionFactory.createOne({
                        language,
                        bookmarkers: user.profile,
                        texts: [context.textFactory.makeOne({language, pastViewers: [user1.profile, user2.profile]})]
                    }),
                ];
                await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
                const recordsCount = expectedCollections.length;

                const response = await makeRequest({sortBy: "avgPastViewersCountPerText"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: collectionSummaryLoggedInSerializer.serializeList(expectedCollections)
                });
            });
            test<TestContext>("if sortBy is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const response = await makeRequest({sortBy: "texts"}, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<TestContext>("test sortOrder ascending", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedCollections = [
                    await context.collectionFactory.createOne({title: "abc", bookmarkers: user.profile, language}),
                    await context.collectionFactory.createOne({title: "def", bookmarkers: user.profile, language})
                ];
                await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
                const recordsCount = expectedCollections.length;

                const response = await makeRequest({sortOrder: "asc"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: collectionSummaryLoggedInSerializer.serializeList(expectedCollections)
                });
            });
            test<TestContext>("test sortOrder descending", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedCollections = [
                    await context.collectionFactory.createOne({title: "def", bookmarkers: user.profile, language}),
                    await context.collectionFactory.createOne({title: "abc", bookmarkers: user.profile, language}),
                ];
                await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
                const recordsCount = expectedCollections.length;

                const response = await makeRequest({sortOrder: "desc"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: collectionSummaryLoggedInSerializer.serializeList(expectedCollections)
                });
            });
            test<TestContext>("if sortBy is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const response = await makeRequest({sortOrder: "rising"}, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
    });
    describe("test pagination", () => {
        describe("test page", () => {
            test<TestContext>("If page is 1 return the first page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allCollections = await context.collectionFactory.create(10, {
                    language,
                    bookmarkers: user.profile
                });
                allCollections.sort(defaultSortComparator);
                const recordsCount = allCollections.length;
                const page = 1, pageSize = 3;
                const expectedCollections = allCollections.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: collectionSummaryLoggedInSerializer.serializeList(expectedCollections)
                });
            });
            test<TestContext>("If page is 2 return the second page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allCollections = await context.collectionFactory.create(10, {
                    language,
                    bookmarkers: user.profile
                });
                allCollections.sort(defaultSortComparator);
                const recordsCount = allCollections.length;
                const page = 2, pageSize = 3;
                const expectedCollections = allCollections.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: collectionSummaryLoggedInSerializer.serializeList(expectedCollections)
                });
            });
            test<TestContext>("If page is last return the last page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allCollections = await context.collectionFactory.create(10, {
                    language,
                    bookmarkers: user.profile
                });
                allCollections.sort(defaultSortComparator);
                const recordsCount = allCollections.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedCollections = allCollections.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: collectionSummaryLoggedInSerializer.serializeList(expectedCollections)
                });
            });
            test<TestContext>("If page is more than last return empty page", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allCollections = await context.collectionFactory.create(10, {
                    language,
                    bookmarkers: user.profile
                });
                const recordsCount = allCollections.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize) + 1;
                const expectedCollections = allCollections.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);

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
                    const session = await context.sessionFactory.createOne({user});
                    const response = await makeRequest({page: 0, pageSize: 3}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<TestContext>("If page is not a number return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user});
                    const response = await makeRequest({page: "last", pageSize: 3}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
            });
        });
        describe("test pageSize", () => {
            test<TestContext>("If pageSize is 20 split the results into 20 sized pages", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allCollections = await context.collectionFactory.create(50, {
                    language,
                    bookmarkers: user.profile
                });
                allCollections.sort(defaultSortComparator);
                const recordsCount = allCollections.length;
                const page = 2, pageSize = 20;
                const expectedCollections = allCollections.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: collectionSummaryLoggedInSerializer.serializeList(expectedCollections)
                });
                expect(response.json().data.length).toBeLessThanOrEqual(pageSize);
            });
            describe("If pageSize is invalid return 400", () => {
                test<TestContext>("If pageSize is too big return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user});
                    const response = await makeRequest({page: 1, pageSize: 250}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<TestContext>("If pageSize is negative return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user});
                    const response = await makeRequest({page: 1, pageSize: -20}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<TestContext>("If pageSize is not a number return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user});
                    const response = await makeRequest({page: 1, pageSize: "a lot"}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
            });
        });
    });
});
