import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {buildQueryString, createComparator, fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {textLoggedInSerializer} from "@/src/presentation/response/serializers/Text/TextLoggedInSerializer.js";
import {Text} from "@/src/models/entities/Text.js";
import {faker} from "@faker-js/faker";
import {randomCase} from "@/test/utils.js";

/**{@link TextController#getUserHiddenTexts}*/
describe("GET users/me/texts/hidden/", () => {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/me/texts/hidden/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const queryDefaults = {pagination: {pageSize: 10, page: 1}};
    const defaultSortComparator = createComparator(Text, [
        {property: "title", order: "asc"},
        {property: "id", order: "asc"}
    ]);

    test<TestContext>("If user is logged in and there are no filters return hidden texts by user", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const expectedTexts = await context.textFactory.create(3, {language, hiddenBy: user.profile});
        await context.textFactory.create(3, {language});
        await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
        expectedTexts.sort(defaultSortComparator);
        const recordsCount = expectedTexts.length;

        const response = await makeRequest({}, session.token);

        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: textLoggedInSerializer.serializeList(expectedTexts)
        });
    });

    describe("test languageCode filter", () => {
        test<TestContext>("If language filter is valid and language exists only return hidden texts in that language", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            const expectedTexts = await context.textFactory.create(3, {language: language1, hiddenBy: user.profile});
            await context.textFactory.create(3, {language: language2, hiddenBy: user.profile});
            await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({languageCode: language1.code}, session.token);

            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textLoggedInSerializer.serializeList(expectedTexts)
            });
        });
        test<TestContext>("If language does not exist return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            await context.textFactory.create(3, {language: await context.languageFactory.createOne(), hiddenBy: user.profile});

            const response = await makeRequest({languageCode: faker.random.alpha({count: 4})}, session.token);

            expect(response.statusCode).toEqual(200);
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
            expect(response.statusCode).toEqual(400);
        });
    });
    describe("test addedBy filter", () => {
        test<TestContext>("If addedBy filter is valid and user exists only return hidden texts added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const otherUser = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const expectedTexts = await context.textFactory.create(3, {language, addedBy: otherUser.profile, hiddenBy: user.profile});
            await context.textFactory.create(3, {language, addedBy: user.profile, hiddenBy: user.profile});
            await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({addedBy: otherUser.username}, session.token);

            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textLoggedInSerializer.serializeList(expectedTexts)
            });
        });
        test<TestContext>("If addedBy is me return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();
            await context.textFactory.create(3, {language, hiddenBy: user.profile});

            const response = await makeRequest({addedBy: "me"}, session.token);

            expect(response.statusCode).toEqual(400);
        });
        test<TestContext>("If user does not exist return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            await context.textFactory.create(3, {language: await context.languageFactory.createOne(), hiddenBy: user.profile});

            const response = await makeRequest({addedBy: faker.random.alpha({count: 10})}, session.token);

            expect(response.statusCode).toEqual(200);
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
            expect(response.statusCode).toEqual(400);
        });
    });
    describe("test searchQuery filter", () => {
        test<TestContext>("If searchQuery is valid return hidden texts with query in title", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();
            const searchQuery = "search query";
            const expectedTexts = [
                await context.textFactory.createOne({language, hiddenBy: user.profile, title: `${randomCase(searchQuery)} ${faker.random.alpha(6)}`}),
                await context.textFactory.createOne({language, hiddenBy: user.profile, title: `${faker.random.alpha(5)} ${randomCase(searchQuery)}`}),
                await context.textFactory.createOne({language, hiddenBy: user.profile, title: `${faker.random.alpha(5)} ${randomCase(searchQuery)}`})
            ];
            await context.textFactory.create(3, {language, hiddenBy: user.profile});
            await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({searchQuery}, session.token);

            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textLoggedInSerializer.serializeList(expectedTexts)
            });
        });
        test<TestContext>("If searchQuery is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})}, session.token);
            expect(response.statusCode).toEqual(400);
        });
        test<TestContext>("If no texts match search query return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            await context.textFactory.create(3, {language: await context.languageFactory.createOne(), hiddenBy: user.profile});

            const response = await makeRequest({searchQuery: faker.random.alpha({count: 50})}, session.token);

            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: 0,
                data: []
            });
        });
    });
    describe("test hasAudio filter", () => {
        test<TestContext>("If hasAudio is true return hidden texts with audio", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();
            const expectedTexts = await context.textFactory.create(3, {language, hiddenBy: user.profile, audio: faker.internet.url()});
            await context.textFactory.create(3, {language, hiddenBy: user.profile, audio: ""});
            await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({hasAudio: true}, session.token);

            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textLoggedInSerializer.serializeList(expectedTexts)
            });
        });
        test<TestContext>("If hasAudio is false return hidden texts with no audio", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();
            const expectedTexts = await context.textFactory.create(3, {language, hiddenBy: user.profile, audio: ""});
            await context.textFactory.create(3, {language, hiddenBy: user.profile, audio: faker.internet.url()});
            await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({hasAudio: false}, session.token);

            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textLoggedInSerializer.serializeList(expectedTexts)
            });
        });
        test<TestContext>("If hasAudio is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const response = await makeRequest({hasAudio: "maybe"}, session.token);
            expect(response.statusCode).toEqual(400);
        });
    });
    describe("test sort", () => {
        describe("test sortBy", () => {
            test<TestContext>("test sortBy title", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, hiddenBy: user.profile, title: "abc"}),
                    await context.textFactory.createOne({language, hiddenBy: user.profile, title: "def"})
                ];
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
                const recordsCount = expectedTexts.length;

                const response = await makeRequest({sortBy: "title"}, session.token);

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textLoggedInSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("test sortBy createdDate", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, hiddenBy: user.profile, addedOn: new Date("2018-07-22T10:30:45.000Z")}),
                    await context.textFactory.createOne({language, hiddenBy: user.profile, addedOn: new Date("2023-03-15T20:29:42.000Z")})
                ];
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
                const recordsCount = expectedTexts.length;

                const response = await makeRequest({sortBy: "createdDate"}, session.token);

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textLoggedInSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("test sortBy pastViewersCount", async (context) => {
                const user = await context.userFactory.createOne();
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, hiddenBy: user.profile, pastViewers: []}),
                    await context.textFactory.createOne({language, hiddenBy: user.profile, pastViewers: [user1.profile]}),
                    await context.textFactory.createOne({language, hiddenBy: user.profile, pastViewers: [user1.profile, user2.profile]})
                ];
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
                const recordsCount = expectedTexts.length;

                const response = await makeRequest({sortBy: "pastViewersCount"}, session.token);

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textLoggedInSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("if sortBy is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const response = await makeRequest({sortBy: "text"}, session.token);
                expect(response.statusCode).toEqual(400);
            });
        });
        describe("test sortOrder", () => {
            test<TestContext>("If sortOrder is asc return the texts in ascending order", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, hiddenBy: user.profile, title: "abc"}),
                    await context.textFactory.createOne({language, hiddenBy: user.profile, title: "def"})
                ];
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
                const recordsCount = expectedTexts.length;

                const response = await makeRequest({sortOrder: "asc"}, session.token);

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textLoggedInSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("If sortOrder is desc return the texts in descending order", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, hiddenBy: user.profile, title: "def"}),
                    await context.textFactory.createOne({language, hiddenBy: user.profile, title: "abc"})
                ];
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
                const recordsCount = expectedTexts.length;

                const response = await makeRequest({sortOrder: "desc"}, session.token);

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textLoggedInSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("If sortBy is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const response = await makeRequest({sortOrder: "rising"}, session.token);
                expect(response.statusCode).toEqual(400);
            });
        });
    });
    describe("test pagination", () => {
        describe("test page", () => {
            test<TestContext>("If page is 1 return the first page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allTexts = await context.textFactory.create(10, {language, hiddenBy: user.profile});
                allTexts.sort(defaultSortComparator);
                const recordsCount = allTexts.length;
                const page = 1, pageSize = 3;
                const expectedTexts = allTexts.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: textLoggedInSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("If page is 2 return the second page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allTexts = await context.textFactory.create(10, {language, hiddenBy: user.profile});
                allTexts.sort(defaultSortComparator);
                const recordsCount = allTexts.length;
                const page = 2, pageSize = 3;
                const expectedTexts = allTexts.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: textLoggedInSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("If page is last return the last page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allTexts = await context.textFactory.create(10, {language, hiddenBy: user.profile});
                allTexts.sort(defaultSortComparator);
                const recordsCount = allTexts.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedTexts = allTexts.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: textLoggedInSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("If page is more than last return empty page", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allTexts = await context.textFactory.create(10, {language, hiddenBy: user.profile});
                allTexts.sort(defaultSortComparator);
                const recordsCount = allTexts.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize) + 1;

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).toEqual(200);
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

                    expect(response.statusCode).toEqual(400);
                });
                test<TestContext>("If page is not a number return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user});
                    const response = await makeRequest({page: "last", pageSize: 3}, session.token);

                    expect(response.statusCode).toEqual(400);
                });
            });
        });
        describe("test pageSize", () => {
            test<TestContext>("If pageSize is 20 split the results into 20 sized pages", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allTexts = await context.textFactory.create(50, {language, hiddenBy: user.profile});
                allTexts.sort(defaultSortComparator);
                const recordsCount = allTexts.length;
                const pageSize = 20;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedTexts = allTexts.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: textLoggedInSerializer.serializeList(expectedTexts)
                });
                expect(response.json().data.length).toBeLessThanOrEqual(pageSize);
            });
            describe("If pageSize is invalid return 400", () => {
                test<TestContext>("If pageSize is too big return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user});
                    const response = await makeRequest({page: 1, pageSize: 250}, session.token);

                    expect(response.statusCode).toEqual(400);
                });
                test<TestContext>("If pageSize is negative return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user});
                    const response = await makeRequest({page: 1, pageSize: -20}, session.token);

                    expect(response.statusCode).toEqual(400);
                });
                test<TestContext>("If pageSize is not a number return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user});
                    const response = await makeRequest({page: 1, pageSize: "a lot"}, session.token);

                    expect(response.statusCode).toEqual(400);
                });
            });
        });
    });
    describe("test privacy", () => {
        test<TestContext>("If user hid text but it is private, do not include it in hidden texts list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();
            await context.textFactory.create(3, {language, isPublic: false, hiddenBy: user.profile});

            const response = await makeRequest({}, session.token);

            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: 0,
                data: []
            });
        });
        describe("Texts in collection inherit its privacy setting", () => {
            test<TestContext>("If user hid text but it is in private collection, do not include it in hidden texts list", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({language, isPublic: false});
                await context.textFactory.create(3, {language, collection, isPublic: true, hiddenBy: user.profile});

                const response = await makeRequest({}, session.token);

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: 0,
                    data: []
                });
            });
            test<TestContext>("If user hid text and it is in public collection, include it in hidden texts list", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const publicCollection = await context.collectionFactory.createOne({language, isPublic: true});
                const expectedTexts = [
                    ...await context.textFactory.create(3, {language, hiddenBy: user.profile, isPublic: true}),
                    ...await context.textFactory.create(3, {language, collection: publicCollection, isPublic: false, hiddenBy: user.profile}),
                ];
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
                await context.textFactory.create(3, {language, isPublic: false});
                expectedTexts.sort(defaultSortComparator);
                const recordsCount = expectedTexts.length;

                const response = await makeRequest({}, session.token);

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textLoggedInSerializer.serializeList(expectedTexts)
                });
            });
        })
    });
    test<TestContext>("If user is not logged in return 401", async () => {
        const response = await makeRequest();
        expect(response.statusCode).toEqual(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const response = await makeRequest({}, session.token);
        expect(response.statusCode).toEqual(403);
    });
});