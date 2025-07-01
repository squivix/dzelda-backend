import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {buildQueryString, createComparator, fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {Text} from "@/src/models/entities/Text.js";
import {faker} from "@faker-js/faker";
import {randomCase, randomEnum, randomEnums} from "@/test/utils.js";
import {LanguageLevel} from "dzelda-common";
import {textSerializer} from "@/src/presentation/response/serializers/Text/TextSerializer.js";
import {textLoggedInSerializer} from "@/src/presentation/response/serializers/Text/TextLoggedInSerializer.js";

/**{@link TextController#getTexts}*/
describe("GET texts/", () => {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `texts/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const queryDefaults = {pagination: {pageSize: 10, page: 1}};
    const defaultSortComparator = createComparator(Text, [
        {property: "title", order: "asc"},
        {property: "id", order: "asc"}]
    );
    test<TestContext>("If there are no filters and not logged in return all public texts", async (context) => {
        const language = await context.languageFactory.createOne();
        const expectedTexts = await context.textFactory.create(3, {
            language: language,
            isPublic: true
        });
        await context.textFactory.create(3, {language: language, isPublic: false});
        expectedTexts.sort(defaultSortComparator);
        const recordsCount = expectedTexts.length;

        const response = await makeRequest();

        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: textSerializer.serializeList(expectedTexts)
        });
    });
    describe("test languageCode filter", () => {
        test<TestContext>("If language filter is valid and language exists only return public texts in that language", async (context) => {
            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            const expectedTexts = await context.textFactory.create(3, {
                language: language1,
                isPublic: true
            });
            await context.textFactory.create(3, {language: language1, isPublic: false});
            await context.textFactory.create(3, {language: language2, isPublic: true});
            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({languageCode: language1.code});

            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<TestContext>("If language does not exist return empty list", async (context) => {
            await context.textFactory.create(3, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({languageCode: faker.random.alpha({count: 4})});

            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: 0,
                data: []
            });
        });
        test<TestContext>("If language filter is invalid return 400", async () => {
            const response = await makeRequest({languageCode: 12345});

            expect(response.statusCode).toEqual(400);
        });
    });
    describe("test level filter", () => {
        test<TestContext>("If the level is valid return texts in that level", async (context) => {
            const level = randomEnum(LanguageLevel);
            const language = await context.languageFactory.createOne();
            const expectedTexts = await context.textFactory.create(3, {language, isPublic: true, level: level});
            await context.textFactory.create(3, {language, level: level, isPublic: false});
            await context.textFactory.create(3, {language, level: randomEnum(LanguageLevel, [level]), isPublic: true});
            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({level: level});

            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<TestContext>("If multiple levels are sent return texts in any of those levels", async (context) => {
            const levels = randomEnums(2, LanguageLevel);
            const language = await context.languageFactory.createOne();

            const expectedTexts = (await Promise.all(levels.map(level => context.textFactory.create(3, {language, isPublic: true, level: level})))).flat();
            await Promise.all(levels.map(level => context.textFactory.create(3, {language, isPublic: false, level: level})));
            await context.textFactory.create(3, {language, level: randomEnum(LanguageLevel, levels), isPublic: true});
            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({level: levels});

            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<TestContext>("If the level is invalid return 400", async () => {
            const response = await makeRequest({level: "hard"});

            expect(response.statusCode).toEqual(400);
        });
    });
    describe("test addedBy filter", () => {
        test<TestContext>("If addedBy filter is valid and user exists only return public texts added by that user", async (context) => {
            const user1 = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const expectedTexts = await context.textFactory.create(3, {
                language: language,
                addedBy: user1.profile
            });
            await context.textFactory.create(3, {language: language});
            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({addedBy: user1.username});

            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<TestContext>("If addedBy is me and signed in return texts added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();
            const expectedTexts = await context.textFactory.create(3, {
                language: language,
                addedBy: user.profile
            });
            await context.textFactory.create(3, {language: language});
            await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({addedBy: "me"}, session.token);

            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textLoggedInSerializer.serializeList(expectedTexts)
            });
        });
        test<TestContext>("If addedBy is me and not signed in return 401", async (context) => {
            const response = await makeRequest({addedBy: "me"});
            expect(response.statusCode).toEqual(401);
        });
        test<TestContext>("If user does not exist return empty list", async (context) => {
            const response = await makeRequest({addedBy: faker.random.alpha({count: 20})});

            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: 0,
                data: []
            });
        });
        test<TestContext>("If addedBy filter is invalid return 400", async () => {
            const response = await makeRequest({addedBy: ""});
            expect(response.statusCode).toEqual(400);
        });
    });
    describe("test searchQuery filter", () => {
        test<TestContext>("If searchQuery is valid return texts with query in title", async (context) => {
            const language = await context.languageFactory.createOne();
            const searchQuery = "search query";
            const expectedTexts = [
                await context.textFactory.createOne({language, title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`}),
                await context.textFactory.createOne({language, title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`}),
                await context.textFactory.createOne({language, title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`})
            ];
            await context.textFactory.create(3, {language});
            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({searchQuery: searchQuery});

            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<TestContext>("If searchQuery is invalid return 400", async () => {
            const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})});

            expect(response.statusCode).toEqual(400);
        });
        test<TestContext>("If no texts match search query return empty list", async (context) => {
            await context.textFactory.create(3, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({searchQuery: faker.random.alpha({count: 200})});

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
        test<TestContext>("If hasAudio is true return texts with audio", async (context) => {
            const language = await context.languageFactory.createOne();
            const expectedTexts = await context.textFactory.create(3, {
                language, isPublic: true,
                audio: "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg"
            });
            await context.textFactory.create(3, {
                language: language, isPublic: true,
                audio: ""
            });
            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({hasAudio: true});

            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<TestContext>("If hasAudio is false return texts with no audio", async (context) => {
            const language = await context.languageFactory.createOne();
            const expectedTexts = await context.textFactory.create(3, {
                language: language, isPublic: true,
                audio: ""
            });
            await context.textFactory.create(3, {
                language, isPublic: true,
                audio: "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg"
            });

            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({hasAudio: false});

            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<TestContext>("If hasAudio is invalid return 400", async () => {
            const response = await makeRequest({hasAudio: "maybe?"});
            expect(response.statusCode).toEqual(400);
        });
    });
    describe("test sort", () => {
        describe("test sortBy", () => {
            test<TestContext>("test sortBy title", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, title: "abc"}),
                    await context.textFactory.createOne({language, title: "def"})
                ];
                const recordsCount = expectedTexts.length;

                const response = await makeRequest({sortBy: "title"});

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("test sortBy createdDate", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, addedOn: new Date("2018-07-22T10:30:45.000Z")}),
                    await context.textFactory.createOne({language, addedOn: new Date("2023-03-15T20:29:42.000Z")})
                ];
                const recordsCount = expectedTexts.length;

                const response = await makeRequest({sortBy: "createdDate"});

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("test sortBy pastViewersCount", async (context) => {
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, pastViewers: []}),
                    await context.textFactory.createOne({language, pastViewers: [user1.profile]}),
                    await context.textFactory.createOne({language, pastViewers: [user1.profile, user2.profile]}),
                ];
                const recordsCount = expectedTexts.length;

                const response = await makeRequest({sortBy: "pastViewersCount", sortOrder: "asc"});

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("if sortBy is invalid return 400", async (context) => {
                const response = await makeRequest({sortBy: "text"});
                expect(response.statusCode).toEqual(400);
            });
        });
        describe("test sortOrder", () => {
            test<TestContext>("If sortOrder is asc return the texts in ascending order", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, title: "abc"}),
                    await context.textFactory.createOne({language, title: "def"})
                ];
                const recordsCount = expectedTexts.length;

                const response = await makeRequest({sortOrder: "asc"});

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("If sortOrder is desc return the texts in descending order", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, title: "def"}),
                    await context.textFactory.createOne({language, title: "abc"}),
                ];
                const recordsCount = expectedTexts.length;

                const response = await makeRequest({sortOrder: "desc"});

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("If sortBy is invalid return 400", async (context) => {
                const response = await makeRequest({sortOrder: "rising"});
                expect(response.statusCode).toEqual(400);
            });
        });
    });
    describe("test pagination", () => {
        describe("test page", () => {
            test<TestContext>("If page is 1 return the first page of results", async (context) => {
                const language = await context.languageFactory.createOne();
                const allTexts = await context.textFactory.create(10, {
                    language,
                    isPublic: true
                });
                allTexts.sort(defaultSortComparator);
                const recordsCount = allTexts.length;
                const page = 1, pageSize = 3;
                const expectedTexts = allTexts.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("If page is 2 return the second page of results", async (context) => {
                const language = await context.languageFactory.createOne();
                const allTexts = await context.textFactory.create(10, {
                    language,
                    isPublic: true
                });
                allTexts.sort(defaultSortComparator);
                const recordsCount = allTexts.length;
                const page = 1, pageSize = 3;
                const expectedTexts = allTexts.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("If page is last return the last page of results", async (context) => {
                const language = await context.languageFactory.createOne();
                const allTexts = await context.textFactory.create(10, {
                    language,
                    isPublic: true
                });
                allTexts.sort(defaultSortComparator);
                const recordsCount = allTexts.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedTexts = allTexts.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<TestContext>("If page is more than last return empty page", async (context) => {
                const language = await context.languageFactory.createOne();
                const allTexts = await context.textFactory.create(10, {
                    language,
                    isPublic: true
                });
                allTexts.sort(defaultSortComparator);
                const recordsCount = allTexts.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize) + 1;
                const expectedTexts = allTexts.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

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
                    const response = await makeRequest({page: 0, pageSize: 3});

                    expect(response.statusCode).toEqual(400);
                });
                test<TestContext>("If page is not a number return 400", async (context) => {
                    const response = await makeRequest({page: "last", pageSize: 3});

                    expect(response.statusCode).toEqual(400);
                });
            });
        });
        describe("test pageSize", () => {
            test<TestContext>("If pageSize is 20 split the results into 20 sized pages", async (context) => {
                const language = await context.languageFactory.createOne();
                const allTexts = await context.textFactory.create(50, {
                    language,
                    isPublic: true
                });
                allTexts.sort(defaultSortComparator);
                const recordsCount = allTexts.length;
                const pageSize = 20;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedTexts = allTexts.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).toEqual(200);
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
                    const response = await makeRequest({page: 1, pageSize: 250});

                    expect(response.statusCode).toEqual(400);
                });
                test<TestContext>("If pageSize is negative return 400", async (context) => {
                    const response = await makeRequest({page: 1, pageSize: -20});

                    expect(response.statusCode).toEqual(400);
                });
                test<TestContext>("If pageSize is not a number return 400", async (context) => {
                    const response = await makeRequest({page: 1, pageSize: "a lot"});

                    expect(response.statusCode).toEqual(400);
                });
            });
        });
    });
    describe("test privacy", () => {
        describe("Hide private texts from non-authors", () => {
            test<TestContext>("If user is not logged in hide private texts", async (context) => {
                const author = await context.userFactory.createOne();
                const language = await context.languageFactory.createOne();
                await context.textFactory.create(3, {language, addedBy: author.profile, isPublic: false});

                const response = await makeRequest();

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: 0,
                    data: []
                });
            });
            test<TestContext>("If user is not author hide private texts", async (context) => {
                const user = await context.userFactory.createOne();
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                await context.textFactory.create(3, {language, addedBy: author.profile, isPublic: false});

                const response = await makeRequest({}, session.token);

                expect(response.statusCode).toEqual(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: 0,
                    data: []
                });
            });
            test<TestContext>("If user is author show private texts", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    ...await context.textFactory.create(3, {language, isPublic: true}),
                    ...await context.textFactory.create(3, {
                        language,
                        isPublic: false,
                        addedBy: user.profile
                    }),
                ];
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
                await context.textFactory.create(3, {language: language, isPublic: false});
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
        describe("Texts in collection inherit its privacy setting", () => {
            describe("If collection is private, text is private", async () => {
                test<TestContext>("If user is not logged in hide texts in private collection", async (context) => {
                    const author = await context.userFactory.createOne();
                    const language = await context.languageFactory.createOne();
                    const collection = await context.collectionFactory.createOne({language, isPublic: false});
                    await context.textFactory.create(3, {language, collection, addedBy: author.profile, isPublic: true});

                    const response = await makeRequest();

                    expect(response.statusCode).toEqual(200);
                    expect(response.json()).toEqual({
                        page: queryDefaults.pagination.page,
                        pageSize: queryDefaults.pagination.pageSize,
                        pageCount: 0,
                        data: []
                    });
                });
                test<TestContext>("If user is not author hide texts in private collection", async (context) => {
                    const user = await context.userFactory.createOne();
                    const author = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const language = await context.languageFactory.createOne();
                    const collection = await context.collectionFactory.createOne({language, isPublic: false});
                    await context.textFactory.create(3, {language, collection, addedBy: author.profile, isPublic: true});

                    const response = await makeRequest({}, session.token);

                    expect(response.statusCode).toEqual(200);
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
                        ...await context.textFactory.create(3, {language, collection: publicCollection}),
                        ...await context.textFactory.create(3, {language, collection: privateCollection, addedBy: author.profile}),
                    ];
                    await context.textRepo.annotateTextsWithUserData(expectedTexts, author);
                    await context.textFactory.create(3, {language: language, isPublic: false});
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
            });
            test<TestContext>("If collection is public, text is public", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const publicCollection = await context.collectionFactory.createOne({language, isPublic: true});
                const expectedTexts = [
                    ...await context.textFactory.create(3, {language, isPublic: true}),
                    ...await context.textFactory.create(3, {
                        language, collection: publicCollection,
                        isPublic: false,
                    }),
                ];
                await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
                await context.textFactory.create(3, {language: language, isPublic: false});
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
    test<TestContext>("If logged in return texts with vocab levels for user", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const expectedTexts = await context.textFactory.create(3, {
            language: language,
            isPublic: true
        });
        await context.textRepo.annotateTextsWithUserData(expectedTexts, user);
        await context.textFactory.create(3, {language: language, isPublic: false});
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
});
