import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {buildQueryString, createComparator, fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {TextHistoryEntry} from "@/src/models/entities/TextHistoryEntry.js";
import {faker} from "@faker-js/faker";
import {randomCase} from "@/test/utils.js";
import {textHistoryEntrySerializer} from "@/src/presentation/response/serializers/TextHistoryEntry/TextHistoryEntrySerializer.js";

/**{@link TextController#getUserTextsHistory}*/
describe("GET users/me/texts/history/", () => {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/me/texts/history/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const queryDefaults = {pagination: {pageSize: 10, page: 1}};
    const defaultSortComparator = createComparator(TextHistoryEntry, [
        {property: "text.title", order: "asc"},
        {property: "text.id", order: "asc"}]
    );
    test<TestContext>("If user is logged in and there are no filters return texts in user history", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const expectedTexts = await context.textFactory.create(3, {language, isPublic: true, pastViewersCount: 1});
        await context.textFactory.create(3, {language, isPublic: true});
        await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
        const expectedHistoryEntries = expectedTexts.map(text => context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text}));
        await context.em.flush();
        expectedHistoryEntries.sort(defaultSortComparator);
        const recordsCount = expectedHistoryEntries.length;

        const response = await makeRequest({}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: textHistoryEntrySerializer.serializeList(expectedHistoryEntries)
        });
    });
    describe("test languageCode filter", () => {
        test<TestContext>("If language filter is valid and language exists only return public texts in that language", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            const expectedTexts = await context.textFactory.create(3, {language: language1, isPublic: true, pastViewersCount: 1});
            await context.textFactory.create(3, {language: language2, isPublic: true, pastViewers: [user.profile]});
            await context.textFactory.create(3, {language: language1, isPublic: true});
            await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
            const expectedHistoryEntries = expectedTexts.map(text => context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text}));
            await context.em.flush();
            expectedHistoryEntries.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({languageCode: language1.code}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textHistoryEntrySerializer.serializeList(expectedHistoryEntries)
            });
        });
        test<TestContext>("If language does not exist return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            await context.textFactory.create(3, {
                language: await context.languageFactory.createOne(),
                isPublic: true,
                pastViewers: [user.profile]
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
            const session = await context.sessionFactory.createOne({user: user});
            const response = await makeRequest({languageCode: 12345}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test addedBy filter", () => {
        test<TestContext>("If addedBy filter is valid and user exists only return public texts added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const user1 = await context.userFactory.createOne();
            const user2 = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();

            const expectedTexts = await context.textFactory.create(3, {language, addedBy: user1.profile, pastViewersCount: 1});
            await context.textFactory.create(3, {language, addedBy: user2.profile, isPublic: true, pastViewers: [user.profile],});
            await context.textFactory.create(3, {language, addedBy: user1.profile, isPublic: false, pastViewers: [user.profile],});
            await context.textFactory.create(3, {language, addedBy: user1.profile});
            await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
            const expectedHistoryEntries = expectedTexts.map(text => context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text}));
            await context.em.flush();
            expectedHistoryEntries.sort(defaultSortComparator);
            const recordsCount = expectedHistoryEntries.length;

            const response = await makeRequest({addedBy: user1.username}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textHistoryEntrySerializer.serializeList(expectedHistoryEntries)
            });
        });
        test<TestContext>("If addedBy is me return texts added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const otherUser = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();

            const expectedTexts = await context.textFactory.create(3, {language, addedBy: user.profile, pastViewersCount: 1});
            await context.textFactory.create(3, {language, addedBy: otherUser.profile, isPublic: true, pastViewers: [user.profile]});
            await context.textFactory.create(3, {language, addedBy: user.profile});
            await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
            const expectedHistoryEntries = expectedTexts.map(text => context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text}));
            await context.em.flush();
            expectedHistoryEntries.sort(defaultSortComparator);
            const recordsCount = expectedHistoryEntries.length;

            const response = await makeRequest({addedBy: "me"}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textHistoryEntrySerializer.serializeList(expectedHistoryEntries)
            });
        });
        test<TestContext>("If user does not exist return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            await context.textFactory.create(3, {
                language: await context.languageFactory.createOne(),
                isPublic: true,
                pastViewers: [user.profile]
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
        test<TestContext>("If searchQuery is valid return texts with query in title", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const searchQuery = "search query";
            const expectedTexts = await Promise.all(Array.from({length: 3}).map(async () =>
                context.textFactory.createOne({language, isPublic: true, pastViewersCount: 1, title: `${randomCase(searchQuery)}-${faker.random.alpha(10)}`})
            ));
            await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
            const expectedHistoryEntries = expectedTexts.map(text => context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text}));
            await context.em.flush();
            expectedHistoryEntries.sort(defaultSortComparator);
            await context.textFactory.create(3, {language, isPublic: true, pastViewers: [user.profile],});
            await context.textFactory.create(3, {language, isPublic: true});
            const recordsCount = expectedHistoryEntries.length;

            const response = await makeRequest({searchQuery: searchQuery}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textHistoryEntrySerializer.serializeList(expectedHistoryEntries)
            });
        });
        test<TestContext>("If searchQuery is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})}, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<TestContext>("If no texts match search query return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            await context.textFactory.create(3, {language: language, isPublic: true, pastViewers: [user.profile]});
            await context.textFactory.create(3, {language: language, isPublic: true});

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
    describe("test hasAudio filter", () => {
        test<TestContext>("If hasAudio is true return texts with audio", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const audio = faker.internet.url();
            const expectedTexts = await context.textFactory.create(3, {language, isPublic: true, pastViewersCount: 1, audio});
            await context.textFactory.create(3, {language, isPublic: true, pastViewers: [user.profile], audio: ""});
            await context.textFactory.create(3, {language, isPublic: true, audio});
            await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
            const expectedHistoryEntries = expectedTexts.map(text => context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text}));
            await context.em.flush();
            expectedHistoryEntries.sort(defaultSortComparator);
            const recordsCount = expectedHistoryEntries.length;

            const response = await makeRequest({hasAudio: true}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textHistoryEntrySerializer.serializeList(expectedHistoryEntries)
            });
        });
        test<TestContext>("If hasAudio is false return texts with no audio", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const audio = faker.internet.url();
            await context.textFactory.create(3, {language, isPublic: true, pastViewers: [user.profile], audio});
            const expectedTexts = await context.textFactory.create(3, {language, isPublic: true, pastViewersCount: 1, audio: ""});
            await context.textFactory.create(3, {language, isPublic: true, audio});
            await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
            const expectedHistoryEntries = expectedTexts.map(text => context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text}));
            await context.em.flush();
            expectedHistoryEntries.sort(defaultSortComparator);
            const recordsCount = expectedHistoryEntries.length;

            const response = await makeRequest({hasAudio: false}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textHistoryEntrySerializer.serializeList(expectedHistoryEntries)
            });
        });
        test<TestContext>("If hasAudio is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const response = await makeRequest({hasAudio: "maybe?"}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test sort", () => {
        describe("test sortBy", () => {
            test<TestContext>("test sortBy title", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, isPublic: true, pastViewersCount: 1, title: "abc"}),
                    await context.textFactory.createOne({language, isPublic: true, pastViewersCount: 1, title: "def"})
                ];
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
                const expectedHistoryEntries = expectedTexts.map(text => context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text}));
                await context.em.flush();
                const recordsCount = expectedHistoryEntries.length;

                const response = await makeRequest({sortBy: "title"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textHistoryEntrySerializer.serializeList(expectedHistoryEntries)
                });
            });
            test<TestContext>("test sortBy createdDate", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();

                const expectedTexts = [
                    await context.textFactory.createOne({
                        language, isPublic: true, pastViewersCount: 1,
                        addedOn: new Date("2018-07-22T10:30:45.000Z")
                    }),
                    await context.textFactory.createOne({
                        language, isPublic: true, pastViewersCount: 1,
                        addedOn: new Date("2023-03-15T20:29:42.000Z")
                    }),
                ];
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
                const expectedHistoryEntries = expectedTexts.map(text => context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text}));
                await context.em.flush();
                const recordsCount = expectedHistoryEntries.length;

                const response = await makeRequest({sortBy: "createdDate"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textHistoryEntrySerializer.serializeList(expectedHistoryEntries)
                });
            });
            test<TestContext>("test sortBy pastViewersCount", async (context) => {
                const user = await context.userFactory.createOne();
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, isPublic: true, pastViewersCount: 1, pastViewers: []}),
                    await context.textFactory.createOne({language, isPublic: true, pastViewersCount: 2, pastViewers: [user1.profile]}),
                    await context.textFactory.createOne({language, isPublic: true, pastViewersCount: 3, pastViewers: [user1.profile, user2.profile]})
                ];
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
                const expectedHistoryEntries = expectedTexts.map(text => context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text}));
                await context.em.flush();
                const recordsCount = expectedHistoryEntries.length;

                const response = await makeRequest({sortBy: "pastViewersCount"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textHistoryEntrySerializer.serializeList(expectedHistoryEntries)
                });
            });
            test<TestContext>("test sortBy timeViewed", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();

                const expectedHistoryEntries = [
                    context.em.create(TextHistoryEntry, {
                        text: await context.textFactory.createOne({language, isPublic: true, pastViewersCount: 1}), pastViewer: user.profile,
                        timeViewed: new Date("2018-07-22T10:30:45.000Z")
                    }),
                    context.em.create(TextHistoryEntry, {
                        text: await context.textFactory.createOne({language, isPublic: true, pastViewersCount: 1}), pastViewer: user.profile,
                        timeViewed: new Date("2023-03-15T20:29:42.000Z")
                    })
                ];
                await context.em.flush();
                await context.textRepo.annotateTextsWithUserData(expectedHistoryEntries.map(e => e.text), user);
                const recordsCount = expectedHistoryEntries.length;

                const response = await makeRequest({sortBy: "timeViewed"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textHistoryEntrySerializer.serializeList(expectedHistoryEntries)
                });
            });
            test<TestContext>("if sortBy is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});

                const response = await makeRequest({sortBy: "text"}, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<TestContext>("If sortOrder is asc return the texts in ascending order", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, isPublic: true, pastViewersCount: 1, title: "abc"}),
                    await context.textFactory.createOne({language, isPublic: true, pastViewersCount: 1, title: "def"})
                ];
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
                const expectedHistoryEntries = expectedTexts.map(text => context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text}));
                await context.em.flush();
                const recordsCount = expectedHistoryEntries.length;

                const response = await makeRequest({sortOrder: "asc"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textHistoryEntrySerializer.serializeList(expectedHistoryEntries)
                });
            });
            test<TestContext>("If sortOrder is desc return the texts in descending order", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, isPublic: true, pastViewersCount: 1, title: "def"}),
                    await context.textFactory.createOne({language, isPublic: true, pastViewersCount: 1, title: "abc"})
                ];
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
                const expectedHistoryEntries = expectedTexts.map(text => context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text}));
                await context.em.flush();
                const recordsCount = expectedHistoryEntries.length;

                const response = await makeRequest({sortOrder: "desc"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textHistoryEntrySerializer.serializeList(expectedHistoryEntries)
                });
            });
            test<TestContext>("If sortBy is invalid return 400", async (context) => {
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
                const allTexts = await context.textFactory.create(10, {language, isPublic: true, pastViewersCount: 1});
                await context.textFactory.create(3, {language, isPublic: true});
                await context.textRepo.annotateTextsWithUserData(allTexts, user);
                const allHistoryEntries = allTexts.map(text => context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text}));
                await context.em.flush();
                allHistoryEntries.sort(defaultSortComparator);

                const recordsCount = allHistoryEntries.length;
                const page = 1, pageSize = 3;
                const expectedHistoryEntries = allHistoryEntries.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: textHistoryEntrySerializer.serializeList(expectedHistoryEntries)
                });
            });
            test<TestContext>("If page is 2 return the second page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const allTexts = await context.textFactory.create(10, {language, isPublic: true, pastViewersCount: 1});
                await context.textFactory.create(3, {language, isPublic: true});
                await context.textRepo.annotateTextsWithUserData(allTexts, user);
                const allHistoryEntries = allTexts.map(text => context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text}));
                await context.em.flush();
                allHistoryEntries.sort(defaultSortComparator);

                const recordsCount = allHistoryEntries.length;
                const page = 2, pageSize = 3;
                const expectedHistoryEntries = allHistoryEntries.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: textHistoryEntrySerializer.serializeList(expectedHistoryEntries)
                });
            });
            test<TestContext>("If page is last return the last page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const allTexts = await context.textFactory.create(10, {language, isPublic: true, pastViewersCount: 1});
                await context.textFactory.create(3, {language, isPublic: true});
                await context.textRepo.annotateTextsWithUserData(allTexts, user);
                const allHistoryEntries = allTexts.map(text => context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text}));
                await context.em.flush();
                allHistoryEntries.sort(defaultSortComparator);

                const recordsCount = allHistoryEntries.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedHistoryEntries = allHistoryEntries.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: textHistoryEntrySerializer.serializeList(expectedHistoryEntries)
                });
            });
            test<TestContext>("If page is more than last return empty page", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const allTexts = await context.textFactory.create(10, {language, isPublic: true, pastViewers: [user.profile]});
                await context.textFactory.create(3, {language, isPublic: true});
                const allHistoryEntries = allTexts.map(text => context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text}));
                allHistoryEntries.sort(defaultSortComparator);

                const recordsCount = allTexts.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize) + 1;
                const expectedTexts = allTexts.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);

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
            test<TestContext>("If pageSize is 20 split the results into 20 sized pages", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const allTexts = await context.textFactory.create(50, {language, isPublic: true, pastViewersCount: 1});
                await context.textFactory.create(3, {language, isPublic: true});
                await context.textRepo.annotateTextsWithUserData(allTexts, user);
                const allHistoryEntries = allTexts.map(text => context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text}));
                await context.em.flush();
                allHistoryEntries.sort(defaultSortComparator);

                const recordsCount = allHistoryEntries.length;
                const page = 1, pageSize = 20;
                const expectedHistoryEntries = allHistoryEntries.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: textHistoryEntrySerializer.serializeList(expectedHistoryEntries)
                });
                expect(response.json().data.length).toBeLessThanOrEqual(pageSize);
            });
            describe("If pageSize is invalid return 400", () => {
                test<TestContext>("If pageSize is too big return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest({page: 1, pageSize: 250}, session.token);
                    expect(response.statusCode).to.equal(400);
                });
                test<TestContext>("If pageSize is negative return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest({page: 1, pageSize: -20}, session.token);
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
    describe("test privacy", () => {
        describe("Hide private texts from non-authors", () => {
            test<TestContext>("If user is not author hide private texts", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                await context.textFactory.create(3, {language, isPublic: false, pastViewers: [user.profile]});

                const response = await makeRequest({}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: 0,
                    data: []
                });
            });
            test<TestContext>("If user is author show private texts", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    ...await context.textFactory.create(3, {language, isPublic: true, pastViewersCount: 1}),
                    ...await context.textFactory.create(3, {language, isPublic: false, addedBy: author.profile, pastViewersCount: 1})
                ];
                await context.textRepo.annotateTextsWithUserData(expectedTexts, author);
                const expectedHistoryEntries = expectedTexts.map(text => context.em.create(TextHistoryEntry, {pastViewer: author.profile, text}));
                await context.em.flush();
                await context.textFactory.create(3, {language, isPublic: false});
                expectedHistoryEntries.sort(defaultSortComparator);
                const recordsCount = expectedHistoryEntries.length;

                const response = await makeRequest({}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textHistoryEntrySerializer.serializeList(expectedHistoryEntries)
                });
            });
        })
        describe("Texts in collection inherit its privacy setting", () => {
            describe("If collection is private, text is private", async () => {
                test<TestContext>("If user is not author hide texts in private collection", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user});
                    const language = await context.languageFactory.createOne();
                    const collection = await context.collectionFactory.createOne({language, isPublic: false});
                    await context.textFactory.create(3, {language, collection, isPublic: true, pastViewers: [user.profile]});

                    const response = await makeRequest({}, session.token);

                    expect(response.statusCode).to.equal(200);
                    expect(response.json()).toEqual({
                        page: queryDefaults.pagination.page,
                        pageSize: queryDefaults.pagination.pageSize,
                        pageCount: 0,
                        data: []
                    });
                });
                test<TestContext>("If user is author show texts in a private collection", async (context) => {
                    const author = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: author});
                    const language = await context.languageFactory.createOne();
                    const publicCollection = await context.collectionFactory.createOne({language, isPublic: true});
                    const privateCollection = await context.collectionFactory.createOne({language, isPublic: false, addedBy: author.profile});
                    const expectedTexts = [
                        ...await context.textFactory.create(3, {language, collection: publicCollection, pastViewersCount: 1}),
                        ...await context.textFactory.create(3, {language, collection: privateCollection, isPublic: false, addedBy: author.profile, pastViewersCount: 1})
                    ];
                    await context.textRepo.annotateTextsWithUserData(expectedTexts, author);
                    const expectedEntries = expectedTexts.map(text => context.em.create(TextHistoryEntry, {pastViewer: author.profile, text}));
                    await context.em.flush();
                    await context.textFactory.create(3, {language, isPublic: false});
                    expectedEntries.sort(defaultSortComparator);
                    const recordsCount = expectedEntries.length;

                    const response = await makeRequest({}, session.token);

                    expect(response.statusCode).to.equal(200);

                    expect(response.json()).toEqual({
                        page: queryDefaults.pagination.page,
                        pageSize: queryDefaults.pagination.pageSize,
                        pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                        data: textHistoryEntrySerializer.serializeList(expectedEntries)
                    });
                });
            });
            test<TestContext>("If collection is public, text is public", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const publicCollection = await context.collectionFactory.createOne({language, isPublic: true});
                const expectedTexts = [
                    ...await context.textFactory.create(3, {language, isPublic: true, pastViewersCount: 1}),
                    ...await context.textFactory.create(3, {language, collection: publicCollection, isPublic: false, pastViewersCount: 1})
                ];
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
                const expectedEntries = expectedTexts.map(text => context.em.create(TextHistoryEntry, {pastViewer: user.profile, text}));
                await context.em.flush();
                await context.textFactory.create(3, {language, isPublic: false});
                expectedEntries.sort(defaultSortComparator);
                const recordsCount = expectedEntries.length;

                const response = await makeRequest({}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textHistoryEntrySerializer.serializeList(expectedEntries)
                });
            });
        })
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
