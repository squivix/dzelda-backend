import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {buildQueryString, createComparator, fetchRequest} from "@/test/integration/utils.js";
import {Text} from "@/src/models/entities/Text.js";
import {textSerializer} from "@/src/presentation/response/serializers/entities/TextSerializer.js";
import {faker} from "@faker-js/faker";
import {randomCase} from "@/test/utils.js";

/**{@link TextController#getUserBookmarkedTexts}*/
describe("GET users/me/texts/bookmarked/", () => {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/me/texts/bookmarked/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const queryDefaults = {pagination: {pageSize: 10, page: 1}};
    const defaultSortComparator = createComparator(Text, [
        {property: "title", order: "asc"},
        {property: "id", order: "asc"}
    ]);

    test<TestContext>("If user is logged in and there are no filters return bookmarked texts by user", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const expectedTexts = await context.textFactory.create(3, {language, bookmarkers: user.profile});
        await context.textFactory.create(3, {language});
        await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
        expectedTexts.sort(defaultSortComparator);
        const recordsCount = expectedTexts.length;

        const response = await makeRequest({}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: textSerializer.serializeList(expectedTexts)
        });
    });

    describe("test languageCode filter", () => {
        test<TestContext>("If language filter is valid and language exists only return bookmarked texts in that language", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            const expectedTexts = await context.textFactory.create(3, {language: language1, bookmarkers: user.profile});
            await context.textFactory.create(3, {language: language2, bookmarkers: user.profile});
            await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({languageCode: language1.code}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<TestContext>("If language does not exist return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            await context.textFactory.create(3, {language: await context.languageFactory.createOne(), bookmarkers: user.profile});

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
        test<TestContext>("If addedBy filter is valid and user exists only return bookmarked texts added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const otherUser = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const expectedTexts = await context.textFactory.create(3, {language, addedBy: otherUser.profile, bookmarkers: user.profile});
            await context.textFactory.create(3, {language, addedBy: user.profile, bookmarkers: user.profile});
            await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({addedBy: otherUser.username}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<TestContext>("If addedBy is me return bookmarked texts created by user themselves", async (context) => {
            const user = await context.userFactory.createOne();
            const otherUser = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();
            const expectedTexts = await context.textFactory.create(3, {language, addedBy: user.profile, bookmarkers: user.profile});
            await context.textFactory.create(3, {language, addedBy: otherUser.profile, bookmarkers: user.profile});
            await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({addedBy: "me"}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<TestContext>("If user does not exist return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            await context.textFactory.create(3, {language: await context.languageFactory.createOne(), bookmarkers: user.profile});

            const response = await makeRequest({addedBy: faker.random.alpha({count: 10})}, session.token);

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
        test<TestContext>("If searchQuery is valid return bookmarked texts with query in title", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();
            const searchQuery = "search query";
            const expectedTexts = [
                await context.textFactory.createOne({language, bookmarkers: user.profile, title: `${randomCase(searchQuery)} ${faker.random.alpha(6)}`}),
                await context.textFactory.createOne({language, bookmarkers: user.profile, title: `${faker.random.alpha(5)} ${randomCase(searchQuery)}`}),
                await context.textFactory.createOne({language, bookmarkers: user.profile, title: `${faker.random.alpha(5)} ${randomCase(searchQuery)}`})
            ];
            await context.textFactory.create(3, {language, bookmarkers: user.profile});
            await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({searchQuery}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<TestContext>("If searchQuery is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})}, session.token);
            expect(response.statusCode).to.equal(400);
        });
        test<TestContext>("If no texts match search query return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            await context.textFactory.create(3, {language: await context.languageFactory.createOne(), bookmarkers: user.profile});

            const response = await makeRequest({searchQuery: faker.random.alpha({count: 50})}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: 0,
                data: []
            });
        });
    });
    describe("test hasAudio filter", () => {
        test<TestContext>("If hasAudio is true return bookmarked texts with audio", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();
            const expectedTexts = await context.textFactory.create(3, {language, bookmarkers: user.profile, audio: faker.internet.url()});
            await context.textFactory.create(3, {language, bookmarkers: user.profile, audio: ""});
            await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({hasAudio: true}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<TestContext>("If hasAudio is false return bookmarked texts with no audio", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();
            const expectedTexts = await context.textFactory.create(3, {language, bookmarkers: user.profile, audio: ""});
            await context.textFactory.create(3, {language, bookmarkers: user.profile, audio: faker.internet.url()});
            await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({hasAudio: false}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<TestContext>("If hasAudio is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const response = await makeRequest({hasAudio: "maybe"}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test sort", () => {
        describe("test sortBy", () => {
            test<TestContext>("test sortBy title", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, bookmarkers: user.profile, title: "abc"}),
                    await context.textFactory.createOne({language, bookmarkers: user.profile, title: "def"})
                ];
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
                const recordsCount = expectedTexts.length;

                const response = await makeRequest({sortBy: "title"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("test sortBy createdDate", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, bookmarkers: user.profile, addedOn: new Date("2018-07-22T10:30:45.000Z")}),
                    await context.textFactory.createOne({language, bookmarkers: user.profile, addedOn: new Date("2023-03-15T20:29:42.000Z")})
                ];
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
                const recordsCount = expectedTexts.length;

                const response = await makeRequest({sortBy: "createdDate"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("test sortBy pastViewersCount", async (context) => {
                const user = await context.userFactory.createOne();
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, bookmarkers: user.profile, pastViewers: []}),
                    await context.textFactory.createOne({language, bookmarkers: user.profile, pastViewers: [user1.profile]}),
                    await context.textFactory.createOne({language, bookmarkers: user.profile, pastViewers: [user1.profile, user2.profile]})
                ];
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
                const recordsCount = expectedTexts.length;

                const response = await makeRequest({sortBy: "pastViewersCount"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("if sortBy is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const response = await makeRequest({sortBy: "text"}, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<TestContext>("If sortOrder is asc return the texts in ascending order", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, bookmarkers: user.profile, title: "abc"}),
                    await context.textFactory.createOne({language, bookmarkers: user.profile, title: "def"})
                ];
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
                const recordsCount = expectedTexts.length;

                const response = await makeRequest({sortOrder: "asc"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("If sortOrder is desc return the texts in descending order", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, bookmarkers: user.profile, title: "def"}),
                    await context.textFactory.createOne({language, bookmarkers: user.profile, title: "abc"})
                ];
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
                const recordsCount = expectedTexts.length;

                const response = await makeRequest({sortOrder: "desc"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("If sortBy is invalid return 400", async (context) => {
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
                const allTexts = await context.textFactory.create(10, {language, bookmarkers: user.profile});
                allTexts.sort(defaultSortComparator);
                const recordsCount = allTexts.length;
                const page = 1, pageSize = 3;
                const expectedTexts = allTexts.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("If page is 2 return the second page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allTexts = await context.textFactory.create(10, {language, bookmarkers: user.profile});
                allTexts.sort(defaultSortComparator);
                const recordsCount = allTexts.length;
                const page = 2, pageSize = 3;
                const expectedTexts = allTexts.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("If page is last return the last page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allTexts = await context.textFactory.create(10, {language, bookmarkers: user.profile});
                allTexts.sort(defaultSortComparator);
                const recordsCount = allTexts.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedTexts = allTexts.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("If page is more than last return empty page", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allTexts = await context.textFactory.create(10, {language, bookmarkers: user.profile});
                allTexts.sort(defaultSortComparator);
                const recordsCount = allTexts.length;
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
                const allTexts = await context.textFactory.create(50, {language, bookmarkers: user.profile});
                allTexts.sort(defaultSortComparator);
                const recordsCount = allTexts.length;
                const pageSize = 20;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedTexts = allTexts.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: textSerializer.serializeList(expectedTexts)
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