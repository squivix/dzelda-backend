import {beforeEach, describe, expect, test, TestContext, vi} from "vitest";
import {UserFactory} from "@/devtools/factories/UserFactory.js";
import {ProfileFactory} from "@/devtools/factories/ProfileFactory.js";
import {SessionFactory} from "@/devtools/factories/SessionFactory.js";
import {CollectionRepo} from "@/src/models/repos/CollectionRepo.js";
import {TextRepo} from "@/src/models/repos/TextRepo.js";
import {LanguageFactory} from "@/devtools/factories/LanguageFactory.js";
import {CollectionFactory} from "@/devtools/factories/CollectionFactory.js";
import {TextFactory} from "@/devtools/factories/TextFactory.js";
import {API_ROOT, orm} from "@/src/server.js";
import {Text} from "@/src/models/entities/Text.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {InjectOptions} from "light-my-request";
import {buildQueryString, createComparator, fetchRequest} from "@/tests/integration/utils.js";
import {textSerializer} from "@/src/presentation/response/serializers/entities/TextSerializer.js";
import {faker} from "@faker-js/faker";
import {randomCase, randomEnum, randomEnums} from "@/tests/utils.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {EntityRepository} from "@mikro-orm/core";
import {MapTextVocab} from "@/src/models/entities/MapTextVocab.js";
import {TextHistoryEntry} from "@/src/models/entities/TextHistoryEntry.js";
import {parsers} from "dzelda-common";
import {textHistoryEntrySerializer} from "@/src/presentation/response/serializers/mappings/TextHistoryEntrySerializer.js";
import {FileUploadRequestFactory} from "@/devtools/factories/FileUploadRequestFactory.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";

interface LocalTestContext extends TestContext {
    languageFactory: LanguageFactory;
    textFactory: TextFactory;
    collectionFactory: CollectionFactory;
    fileUploadRequestFactory: FileUploadRequestFactory;
    collectionRepo: CollectionRepo;
    textRepo: TextRepo;
    vocabRepo: EntityRepository<Vocab>;
}

vi.mock("dzelda-common", async () => {
    return {
        ...(await vi.importActual("dzelda-common") as any),
        getParser: vi.fn(() => parsers["en"])
    };
});
beforeEach<LocalTestContext>(async (context) => {
    await orm.getSchemaGenerator().clearDatabase();
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.profileFactory = new ProfileFactory(context.em);
    context.sessionFactory = new SessionFactory(context.em);
    context.textFactory = new TextFactory(context.em);
    context.collectionFactory = new CollectionFactory(context.em);
    context.languageFactory = new LanguageFactory(context.em);
    context.fileUploadRequestFactory = new FileUploadRequestFactory(context.em);

    context.vocabRepo = context.em.getRepository(Vocab);
    context.textRepo = context.em.getRepository(Text) as TextRepo;
    context.collectionRepo = context.em.getRepository(Collection) as CollectionRepo;
});

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
    test<LocalTestContext>("If there are no filters and not logged in return all public texts", async (context) => {
        const language = await context.languageFactory.createOne();
        const expectedTexts = await context.textFactory.create(3, {
            language: language,
            isPublic: true
        });
        await context.textFactory.create(3, {language: language, isPublic: false});
        expectedTexts.sort(defaultSortComparator);
        const recordsCount = expectedTexts.length;

        const response = await makeRequest();

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: textSerializer.serializeList(expectedTexts)
        });
    });
    describe("test languageCode filter", () => {
        test<LocalTestContext>("If language filter is valid and language exists only return public texts in that language", async (context) => {
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

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<LocalTestContext>("If language does not exist return empty list", async (context) => {
            await context.textFactory.create(3, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({languageCode: faker.random.alpha({count: 4})});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: 0,
                data: []
            });
        });
        test<LocalTestContext>("If language filter is invalid return 400", async () => {
            const response = await makeRequest({languageCode: 12345});

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test level filter", () => {
        test<LocalTestContext>("If the level is valid return texts in that level", async (context) => {
            const level = randomEnum(LanguageLevel);
            const language = await context.languageFactory.createOne();
            const expectedTexts = await context.textFactory.create(3, {language, isPublic: true, level: level});
            await context.textFactory.create(3, {language, level: level, isPublic: false});
            await context.textFactory.create(3, {language, level: randomEnum(LanguageLevel, [level]), isPublic: true});
            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({level: level});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<LocalTestContext>("If multiple levels are sent return texts in any of those levels", async (context) => {
            const levels = randomEnums(2, LanguageLevel);
            const language = await context.languageFactory.createOne();

            const expectedTexts = (await Promise.all(levels.map(level => context.textFactory.create(3, {language, isPublic: true, level: level})))).flat();
            await Promise.all(levels.map(level => context.textFactory.create(3, {language, isPublic: false, level: level})));
            await context.textFactory.create(3, {language, level: randomEnum(LanguageLevel, levels), isPublic: true});
            expectedTexts.sort(defaultSortComparator);
            const recordsCount = expectedTexts.length;

            const response = await makeRequest({level: levels});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<LocalTestContext>("If the level is invalid return 400", async () => {
            const response = await makeRequest({level: "hard"});

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test addedBy filter", () => {
        test<LocalTestContext>("If addedBy filter is valid and user exists only return public texts added by that user", async (context) => {
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

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<LocalTestContext>("If addedBy is me and signed in return texts added by that user", async (context) => {
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

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<LocalTestContext>("If addedBy is me and not signed in return 401", async (context) => {
            const response = await makeRequest({addedBy: "me"});
            expect(response.statusCode).to.equal(401);
        });
        test<LocalTestContext>("If user does not exist return empty list", async (context) => {
            const response = await makeRequest({addedBy: faker.random.alpha({count: 20})});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: 0,
                data: []
            });
        });
        test<LocalTestContext>("If addedBy filter is invalid return 400", async () => {
            const response = await makeRequest({addedBy: "!@#%#%^#^!"});
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test searchQuery filter", () => {
        test<LocalTestContext>("If searchQuery is valid return texts with query in title", async (context) => {
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

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<LocalTestContext>("If searchQuery is invalid return 400", async () => {
            const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})});

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If no texts match search query return empty list", async (context) => {
            await context.textFactory.create(3, {language: await context.languageFactory.createOne()});

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
    describe("test hasAudio filter", () => {
        test<LocalTestContext>("If hasAudio is true return texts with audio", async (context) => {
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

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<LocalTestContext>("If hasAudio is false return texts with no audio", async (context) => {
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

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: textSerializer.serializeList(expectedTexts)
            });
        });
        test<LocalTestContext>("If hasAudio is invalid return 400", async () => {
            const response = await makeRequest({hasAudio: "maybe?"});
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test sort", () => {
        describe("test sortBy", () => {
            test<LocalTestContext>("test sortBy title", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, title: "abc"}),
                    await context.textFactory.createOne({language, title: "def"})
                ];
                const recordsCount = expectedTexts.length;

                const response = await makeRequest({sortBy: "title"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<LocalTestContext>("test sortBy createdDate", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, addedOn: new Date("2018-07-22T10:30:45.000Z")}),
                    await context.textFactory.createOne({language, addedOn: new Date("2023-03-15T20:29:42.000Z")})
                ];
                const recordsCount = expectedTexts.length;

                const response = await makeRequest({sortBy: "createdDate"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<LocalTestContext>("test sortBy pastViewersCount", async (context) => {
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

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<LocalTestContext>("if sortBy is invalid return 400", async (context) => {
                const response = await makeRequest({sortBy: "text"});
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<LocalTestContext>("If sortOrder is asc return the texts in ascending order", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, title: "abc"}),
                    await context.textFactory.createOne({language, title: "def"})
                ];
                const recordsCount = expectedTexts.length;

                const response = await makeRequest({sortOrder: "asc"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<LocalTestContext>("If sortOrder is desc return the texts in descending order", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedTexts = [
                    await context.textFactory.createOne({language, title: "def"}),
                    await context.textFactory.createOne({language, title: "abc"}),
                ];
                const recordsCount = expectedTexts.length;

                const response = await makeRequest({sortOrder: "desc"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<LocalTestContext>("If sortBy is invalid return 400", async (context) => {
                const response = await makeRequest({sortOrder: "rising"});
                expect(response.statusCode).to.equal(400);
            });
        });
    });
    describe("test pagination", () => {
        describe("test page", () => {
            test<LocalTestContext>("If page is 1 return the first page of results", async (context) => {
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

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<LocalTestContext>("If page is 2 return the second page of results", async (context) => {
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

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<LocalTestContext>("If page is last return the last page of results", async (context) => {
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

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: textSerializer.serializeList(expectedTexts)
                });
            });
            test<LocalTestContext>("If page is more than last return empty page", async (context) => {
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
                    const response = await makeRequest({page: 0, pageSize: 3});

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If page is not a number return 400", async (context) => {
                    const response = await makeRequest({page: "last", pageSize: 3});

                    expect(response.statusCode).to.equal(400);
                });
            });
        });
        describe("test pageSize", () => {
            test<LocalTestContext>("If pageSize is 20 split the results into 20 sized pages", async (context) => {
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
                test<LocalTestContext>("If pageSize is too big return 400", async (context) => {
                    const response = await makeRequest({page: 1, pageSize: 250});

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If pageSize is negative return 400", async (context) => {
                    const response = await makeRequest({page: 1, pageSize: -20});

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If pageSize is not a number return 400", async (context) => {
                    const response = await makeRequest({page: 1, pageSize: "a lot"});

                    expect(response.statusCode).to.equal(400);
                });
            });
        });
    });
    test<LocalTestContext>("If logged in return texts with vocab levels for user", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const expectedTexts = await context.textFactory.create(3, {
            language: language,
            isPublic: true
        });
        context.textRepo.annotateTextsWithUserData(expectedTexts, user);
        await context.textFactory.create(3, {language: language, isPublic: false});
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
    test<LocalTestContext>("If logged in as author of texts return private texts", async (context) => {
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
        context.textRepo.annotateTextsWithUserData(expectedTexts, user);
        await context.textFactory.create(3, {language: language, isPublic: false});
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
});

/**{@link TextController#createText}*/
describe("POST texts/", () => {
    const makeRequest = async (body: object, authToken?: string) => {
        return await fetchRequest({
            method: "POST",
            url: "texts/",
            body: body,
        }, authToken);
    };

    describe("If all fields are valid a new text should be created and return 201", () => {
        test<LocalTestContext>("If optional fields are missing use default values", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newText = context.textFactory.makeOne({level: LanguageLevel.ADVANCED_1, image: "", audio: ""});

            const response = await makeRequest({
                languageCode: language.code,
                title: newText.title,
                text: newText.content,
            }, session.token);

            expect(response.statusCode).to.equal(201);
            const dbRecord = await context.textRepo.findOne({language, title: newText.title}, {populate: ["language", "addedBy.user", "collection.language", "collection.addedBy.user"]});
            expect(dbRecord).not.toBeNull();
            if (!dbRecord) return;
            await context.textRepo.annotateTextsWithUserData([dbRecord], user);
            expect(response.json()).toMatchObject(textSerializer.serialize(newText, {ignore: ["addedOn"]}));
            expect(textSerializer.serialize(dbRecord)).toMatchObject(textSerializer.serialize(newText, {ignore: ["addedOn"]}));
            const parser = parsers["en"];
            const textWords = parser.splitWords(parser.parseText(`${newText.title} ${newText.content}`), {keepDuplicates: false});
            const textVocabs = await context.vocabRepo.find({text: textWords, language: language});
            const textVocabMappings = await context.em.find(MapTextVocab, {vocab: textVocabs, text: dbRecord});

            expect(textVocabs.length).toEqual(textWords.length);
            expect(textVocabs.map(v => v.text)).toEqual(expect.arrayContaining(textWords));
            expect(textVocabMappings.length).toEqual(textWords.length);
        });
        test<LocalTestContext>("If optional fields are provided use provided values", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({language: language, addedBy: user.profile, texts: []});
            const imageUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "textImage"});
            const audioUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "textAudio"});
            const newText = context.textFactory.makeOne({
                language: language,
                image: imageUploadRequest.fileUrl,
                audio: audioUploadRequest.fileUrl,
                addedBy: user.profile,
                collection: collection,
                isPublic: false,
                level: LanguageLevel.BEGINNER_2,
            });

            const response = await makeRequest({
                languageCode: language.code,
                title: newText.title,
                text: newText.content,
                collectionId: collection.id,
                isPublic: newText.isPublic,
                level: newText.level,
                image: imageUploadRequest.objectKey,
                audio: audioUploadRequest.objectKey,
            }, session.token);

            expect(response.statusCode).to.equal(201);
            const dbRecord = await context.textRepo.findOne({collection, title: newText.title}, {populate: ["language", "addedBy.user", "collection.language", "collection.addedBy.user"]});
            expect(dbRecord).not.toBeNull();
            if (!dbRecord) return;
            await context.textRepo.annotateTextsWithUserData([dbRecord], user);
            await context.collectionRepo.annotateCollectionsWithUserData([dbRecord.collection!], user);
            expect(response.json()).toMatchObject(textSerializer.serialize(newText, {ignore: ["addedOn"]}));
            expect(textSerializer.serialize(dbRecord)).toMatchObject(textSerializer.serialize(newText, {ignore: ["addedOn",]}));

            const parser = parsers["en"];
            const textWords = parser.splitWords(parser.parseText(`${newText.title} ${newText.content}`), {keepDuplicates: false});
            const textVocabs = await context.vocabRepo.find({text: textWords, language: collection.language});
            const textVocabMappings = await context.em.find(MapTextVocab, {vocab: textVocabs, text: dbRecord});

            expect(textVocabs.length).toEqual(textWords.length);
            expect(textVocabs.map(v => v.text)).toEqual(expect.arrayContaining(textWords));
            expect(textVocabMappings.length).toEqual(textWords.length);
        });
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const language = await context.languageFactory.createOne();
        const newText = context.textFactory.makeOne({language});

        const response = await makeRequest({
            languageCode: newText.language.code,
            title: newText.title,
            text: newText.content,
        });

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const newText = context.textFactory.makeOne({language});

        const response = await makeRequest({
            languageCode: newText.language.code,
            title: newText.title,
            text: newText.content,
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
    describe("If required fields are missing return 400", async () => {
        test<LocalTestContext>("If title is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newText = context.textFactory.makeOne({language});

            const response = await makeRequest({
                languageCode: newText.language.code,
                text: newText.content,
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If text is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newText = context.textFactory.makeOne({language});

            const response = await makeRequest({
                languageCode: newText.language.code,
                title: newText.title,
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If languageCode is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newText = context.textFactory.makeOne({language});

            const response = await makeRequest({
                title: newText.title,
                text: newText.content,
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 400", async () => {
        test<LocalTestContext>("If title is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newText = context.textFactory.makeOne({language});

            const response = await makeRequest({
                languageCode: newText.language.code,
                title: faker.random.alphaNumeric(200),
                text: newText.content,
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If text is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newText = context.textFactory.makeOne({language});

            const response = await makeRequest({
                languageCode: newText.language.code,
                title: newText.content,
                text: faker.random.words(40000),
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        describe("If collection is invalid return 400", async () => {
            test<LocalTestContext>("If collection id is not a number return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newText = context.textFactory.makeOne({language});

                const response = await makeRequest({
                    languageCode: newText.language.code,
                    title: newText.title,
                    text: newText.content,
                    collectionId: faker.random.alpha(3),
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If collection does not exist return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newText = context.textFactory.makeOne({language});

                const response = await makeRequest({
                    languageCode: newText.language.code,
                    title: newText.title,
                    text: newText.content,
                    collectionId: faker.datatype.number({min: 10000}),
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If collection is in a different language than text return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language1 = await context.languageFactory.createOne();
                const language2 = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({language: language1});
                const newText = context.textFactory.makeOne({language: language2});

                const response = await makeRequest({
                    languageCode: newText.language.code,
                    title: newText.title,
                    text: newText.content,
                    collectionId: collection.id,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If user is not author of collection return 403", async (context) => {
                const user = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({language, addedBy: otherUser.profile, texts: []});
                const newText = context.textFactory.makeOne({language, collection});

                const response = await makeRequest({
                    languageCode: newText.language.code,
                    title: newText.title,
                    text: newText.content,
                    collectionId: collection.id,
                }, session.token);

                expect(response.statusCode).to.equal(403);
            });

        });
        describe("If image is invalid return 400", async () => {
            test<LocalTestContext>("If file upload request with key does not exist return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const imageUploadRequest = await context.fileUploadRequestFactory.makeOne({user: user, fileField: "textImage"});
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "textAudio"});
                const newText = context.textFactory.makeOne({language, image: imageUploadRequest.fileUrl, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest({
                    languageCode: newText.language.code,
                    title: newText.title,
                    text: newText.content,
                    image: imageUploadRequest.objectKey,
                    audio: audioUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If file upload request with key was not requested by user return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({user: otherUser, fileField: "textImage"});
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "textAudio"});
                const newText = context.textFactory.makeOne({language, image: imageUploadRequest.fileUrl, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest({
                    languageCode: newText.language.code,
                    title: newText.title,
                    text: newText.content,
                    image: imageUploadRequest.objectKey,
                    audio: audioUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If file upload request with key is not for textImage field return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "collectionImage"});
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "textAudio"});
                const newText = context.textFactory.makeOne({language, image: imageUploadRequest.fileUrl, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest({
                    languageCode: newText.language.code,
                    title: newText.title,
                    text: newText.content,
                    image: imageUploadRequest.objectKey,
                    audio: audioUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
        describe("If audio is invalid return 400", async () => {
            test<LocalTestContext>("If file upload request with key does not exist return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "textImage"});
                const audioUploadRequest = await context.fileUploadRequestFactory.makeOne({user: user, fileField: "textAudio"});
                const newText = context.textFactory.makeOne({language, image: imageUploadRequest.fileUrl, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest({
                    languageCode: newText.language.code,
                    title: newText.title,
                    text: newText.content,
                    image: imageUploadRequest.objectKey,
                    audio: audioUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If file upload request with key was not requested by user return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "textImage"});
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({user: otherUser, fileField: "textAudio"});
                const newText = context.textFactory.makeOne({language, image: imageUploadRequest.fileUrl, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest({
                    languageCode: newText.language.code,
                    title: newText.title,
                    text: newText.content,
                    image: imageUploadRequest.objectKey,
                    audio: audioUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If file upload request with key is not for textAudio field return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "textImage"});
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "collectionAudio"});
                const newText = context.textFactory.makeOne({language, image: imageUploadRequest.fileUrl, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest({
                    languageCode: newText.language.code,
                    title: newText.title,
                    text: newText.content,
                    image: imageUploadRequest.objectKey,
                    audio: audioUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
    });
});

/**{@link TextController#getText}*/
describe("GET texts/:textId/", () => {
    const makeRequest = async (textId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `texts/${textId}/`,
        };
        return await fetchRequest(options, authToken);
    };

    describe("If the text exists and is public return the text", () => {
        test<LocalTestContext>("If the user is not logged in return text without vocab levels", async (context) => {
            const language = await context.languageFactory.createOne();
            const expectedText = await context.textFactory.createOne({language, isPublic: true});

            const response = await makeRequest(expectedText.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(textSerializer.serialize(expectedText));
        });
        test<LocalTestContext>("If the user is logged in return text with vocab levels", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const expectedText = await context.textFactory.createOne({language, isPublic: true});
            await context.textRepo.annotateTextsWithUserData([expectedText], user);

            const response = await makeRequest(expectedText.id, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(textSerializer.serialize(expectedText));
        });
    });
    test<LocalTestContext>("If the text does not exist return 404", async () => {
        const response = await makeRequest(Number(faker.random.numeric(8)));
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If text id is invalid return 400", async () => {
        const response = await makeRequest(faker.random.alpha(8));
        expect(response.statusCode).to.equal(400);
    });
    test<LocalTestContext>("If the text is not public and the user is not logged in return 404", async (context) => {
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language, isPublic: false});

        const response = await makeRequest(text.id);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If the text is not public and the user is logged in as a non-author return 404", async (context) => {
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language, isPublic: false, addedBy: author.profile});
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: otherUser});

        const response = await makeRequest(text.id, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If the text is not public and the user is logged in as author return text with vocabs by level", async (context) => {
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language, isPublic: false, addedBy: author.profile});
        const session = await context.sessionFactory.createOne({user: author});

        const response = await makeRequest(text.id, session.token);

        await context.textRepo.annotateTextsWithUserData([text], author);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(textSerializer.serialize(text));
    });
});

/**{@link TextController#updateText}*/
describe("PATCH texts/:textId/", () => {
    const makeRequest = async (textId: number | string, body: object, authToken?: string) => {
        return await fetchRequest({
            method: "PATCH",
            url: `texts/${textId}/`,
            body: body,
        }, authToken);
    };

    describe("If the text exists, user is logged in as author and all fields are valid, update text and return 200", async () => {
        test<LocalTestContext>("If optional field are not provided, keep old values", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();

            const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language});
            const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});

            const updatedText = context.textFactory.makeOne({collection, level: text.level});

            const response = await makeRequest(text.id, {
                title: updatedText.title,
                text: updatedText.content
            }, session.token);

            const dbRecord = await context.textRepo.findOneOrFail({id: text.id}, {populate: ["language", "addedBy.user", "collection.language", "collection.addedBy.user"]});
            await context.textRepo.annotateTextsWithUserData([dbRecord], author);
            await context.collectionRepo.annotateCollectionsWithUserData([dbRecord.collection!], author);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toMatchObject(textSerializer.serialize(updatedText, {ignore: []}));
            expect(textSerializer.serialize(dbRecord)).toMatchObject(textSerializer.serialize(updatedText, {ignore: []}));

            const parser = parsers["en"];
            const textWords = parser.splitWords(parser.parseText(`${updatedText.title} ${updatedText.content}`), {keepDuplicates: false});
            const textVocabs = await context.vocabRepo.find({text: textWords, language: collection.language});
            const textVocabMappings = await context.em.find(MapTextVocab, {vocab: textVocabs, text: dbRecord});

            expect(textVocabs.length).toEqual(textWords.length);
            expect(textVocabs.map(v => v.text)).toEqual(expect.arrayContaining(textWords));
            expect(textVocabMappings.length).toEqual(textWords.length);
        });
        describe("If optional fields are provided, update their values", async () => {
            test<LocalTestContext>("If new image and audio are provided, update them", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();

                const collection = await context.collectionFactory.createOne({addedBy: author.profile, language, texts: []});
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({user: author, fileField: "textImage"});
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({user: author, fileField: "textAudio"});
                const updatedText = context.textFactory.makeOne({collection, image: imageUploadRequest.fileUrl, audio: audioUploadRequest.fileUrl, isPublic: !text.isPublic});

                const response = await makeRequest(text.id, {
                    title: updatedText.title,
                    text: updatedText.content,
                    isPublic: updatedText.isPublic,
                    level: updatedText.level,
                    image: imageUploadRequest.objectKey,
                    audio: audioUploadRequest.objectKey,
                }, session.token);

                const dbRecord = await context.textRepo.findOneOrFail({id: text.id}, {populate: ["language", "addedBy.user", "collection.language", "collection.addedBy.user"]});
                await context.em.populate(dbRecord, ["collection"]);
                await context.textRepo.annotateTextsWithUserData([dbRecord], author);
                await context.collectionRepo.annotateCollectionsWithUserData([updatedText.collection!], author);
                await context.collectionRepo.annotateCollectionsWithUserData([dbRecord.collection!], author);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toMatchObject(textSerializer.serialize(updatedText, {ignore: ["addedOn"]}));
                expect(textSerializer.serialize(dbRecord)).toMatchObject(textSerializer.serialize(updatedText, {ignore: ["addedOn"]}));

                const parser = parsers["en"];
                const textWords = parser.splitWords(parser.parseText(`${updatedText.title} ${updatedText.content}`), {keepDuplicates: false});
                const textVocabs = await context.vocabRepo.find({text: textWords, language: collection.language});
                const textVocabMappings = await context.em.find(MapTextVocab, {vocab: textVocabs, text: dbRecord});

                expect(textVocabs.length).toEqual(textWords.length);
                expect(textVocabMappings.length).toEqual(textWords.length);
            });
            test<LocalTestContext>("If new image and audio are blank clear text image and audio", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();

                const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: []});
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const updatedText = context.textFactory.makeOne({collection, image: "", audio: "", isPublic: !text.isPublic});

                const response = await makeRequest(text.id, {
                    title: updatedText.title,
                    text: updatedText.content,
                    isPublic: updatedText.isPublic,
                    level: updatedText.level,
                    image: "",
                    audio: ""
                }, session.token);

                const dbRecord = await context.textRepo.findOneOrFail({id: text.id}, {populate: ["language", "addedBy.user", "collection", "collection.language", "collection.addedBy.user"]});
                await context.em.populate(dbRecord, ["collection"]);
                await context.textRepo.annotateTextsWithUserData([dbRecord], author);
                await context.collectionRepo.annotateCollectionsWithUserData([dbRecord.collection!], author);
                await context.collectionRepo.annotateCollectionsWithUserData([updatedText.collection!], author);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toMatchObject(textSerializer.serialize(updatedText, {ignore: ["addedOn"]}));
                expect(textSerializer.serialize(dbRecord)).toMatchObject(textSerializer.serialize(updatedText, {ignore: ["addedOn"]}));

                const parser = parsers["en"];
                const textWords = parser.splitWords(parser.parseText(`${updatedText.title} ${updatedText.content}`), {keepDuplicates: false});
                const textVocabs = await context.vocabRepo.find({text: textWords, language: collection.language});
                const textVocabMappings = await context.em.find(MapTextVocab, {vocab: textVocabs, text: dbRecord});

                expect(textVocabs.length).toEqual(textWords.length);
                expect(textVocabs.map(v => v.text)).toEqual(expect.arrayContaining(textWords));
                expect(textVocabMappings.length).toEqual(textWords.length);
            });
            test<LocalTestContext>("If collectionId is provided change collection", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();

                const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: []});
                const newCollection = await context.collectionFactory.createOne({addedBy: author.profile, language: language});
                const text = await context.textFactory.createOne({collection: collection, language, addedBy: author.profile});
                const updatedText = context.textFactory.makeOne({collection: newCollection, isPublic: !text.isPublic});

                const response = await makeRequest(text.id, {
                    collectionId: newCollection.id,
                    title: updatedText.title,
                    text: updatedText.content,
                    isPublic: updatedText.isPublic,
                    level: updatedText.level,
                }, session.token);

                const dbRecord = await context.textRepo.findOneOrFail({id: text.id}, {populate: ["language", "addedBy.user", "collection", "collection.language", "collection.addedBy.user"]});
                await context.em.populate(dbRecord, ["collection"]);
                await context.textRepo.annotateTextsWithUserData([dbRecord], author);
                await context.collectionRepo.annotateCollectionsWithUserData([updatedText.collection!], author);
                await context.collectionRepo.annotateCollectionsWithUserData([dbRecord.collection!], author);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toMatchObject(textSerializer.serialize(updatedText, {ignore: ["addedOn"]}));
                expect(textSerializer.serialize(dbRecord)).toMatchObject(textSerializer.serialize(updatedText, {ignore: ["addedOn"]}));
                expect(dbRecord.orderInCollection).toEqual(await newCollection.texts.loadCount() - 1);

                const parser = parsers["en"];
                const textWords = parser.splitWords(parser.parseText(`${updatedText.title} ${updatedText.content}`), {keepDuplicates: false});
                const textVocabs = await context.vocabRepo.find({text: textWords, language: collection.language});
                const textVocabMappings = await context.em.find(MapTextVocab, {vocab: textVocabs, text: dbRecord});

                expect(textVocabs.length).toEqual(textWords.length);
                expect(textVocabMappings.length).toEqual(textWords.length);
            });
            test<LocalTestContext>("If collectionId is null set remove from collection", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();

                const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: []});
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const updatedText = context.textFactory.makeOne({collection: null, isPublic: !text.isPublic});

                const response = await makeRequest(text.id, {
                    collectionId: null,
                    title: updatedText.title,
                    text: updatedText.content,
                    isPublic: updatedText.isPublic,
                    level: updatedText.level,
                }, session.token);

                const dbRecord = await context.textRepo.findOneOrFail({id: text.id}, {populate: ["language", "addedBy.user", "collection", "collection.language", "collection.addedBy.user"]});
                await context.em.populate(dbRecord, ["collection"]);
                await context.textRepo.annotateTextsWithUserData([dbRecord], author);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toMatchObject(textSerializer.serialize(updatedText, {ignore: ["addedOn"]}));
                expect(textSerializer.serialize(dbRecord)).toMatchObject(textSerializer.serialize(updatedText, {ignore: ["addedOn"]}));
                expect(dbRecord.orderInCollection).toEqual(null);

                const parser = parsers["en"];
                const textWords = parser.splitWords(parser.parseText(`${updatedText.title} ${updatedText.content}`), {keepDuplicates: false});
                const textVocabs = await context.vocabRepo.find({text: textWords, language: collection.language});
                const textVocabMappings = await context.em.find(MapTextVocab, {vocab: textVocabs, text: dbRecord});

                expect(textVocabs.length).toEqual(textWords.length);
                expect(textVocabMappings.length).toEqual(textWords.length);
            });
        });
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: []});
        const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
        const updatedText = context.textFactory.makeOne({collection});

        const response = await makeRequest(text.id, {
            title: updatedText.title,
            text: updatedText.content,
        });

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: []});
        const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
        const updatedText = context.textFactory.makeOne({collection});

        const response = await makeRequest(text.id, {
            title: updatedText.title,
            text: updatedText.content,
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
    test<LocalTestContext>("If text does not exist return 404", async (context) => {
        const author = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: author});
        const updatedText = await context.textFactory.makeOne();

        const response = await makeRequest(faker.random.numeric(20), {
            title: updatedText.title,
            text: updatedText.content,
        }, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If text is not public and user is not author return 404", async (context) => {
        const author = await context.userFactory.createOne();
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: otherUser});
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: []});
        const text = await context.textFactory.createOne({collection, language, addedBy: author.profile, isPublic: false,});
        const updatedText = context.textFactory.makeOne();

        const response = await makeRequest(text.id, {
            title: updatedText.title,
            text: updatedText.content,
        }, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If text is public and user is not author of text collection return 403", async (context) => {
        const author = await context.userFactory.createOne();
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: otherUser});
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: []});
        const text = await context.textFactory.createOne({collection, language, addedBy: author.profile, isPublic: true});
        const updatedText = context.textFactory.makeOne();

        const response = await makeRequest(text.id, {
            title: updatedText.title,
            text: updatedText.content,
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
    describe("If required fields are missing return 400", async () => {
        test<LocalTestContext>("If title is missing return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({addedBy: author.profile, language, texts: []});
            const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});

            const updatedText = context.textFactory.makeOne();

            const response = await makeRequest(text.id, {
                text: updatedText.content,
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If text is missing return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({addedBy: author.profile, language, texts: []});
            const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});

            const updatedText = context.textFactory.makeOne();

            const response = await makeRequest(text.id, {
                title: updatedText.title,
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 400", async () => {
        test<LocalTestContext>("If title is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({addedBy: author.profile, language, texts: []});
            const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
            const updatedText = context.textFactory.makeOne({collection});

            const response = await makeRequest(text.id, {
                title: faker.random.alpha({count: 150}),
                text: updatedText.content,
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If text is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({addedBy: author.profile, language, texts: []});
            const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
            const updatedText = context.textFactory.makeOne({collection});

            const response = await makeRequest(text.id, {
                title: updatedText.title,
                text: faker.random.alpha({count: 60_000}),
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If isPublic is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({addedBy: author.profile, language, texts: []});
            const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
            const updatedText = context.textFactory.makeOne({collection});

            const response = await makeRequest(text.id, {
                title: updatedText.title,
                text: updatedText.content,
                isPublic: "kinda?"
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If level is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({addedBy: author.profile, language, texts: []});
            const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
            const updatedText = context.textFactory.makeOne({collection});

            const response = await makeRequest(text.id, {
                title: updatedText.title,
                text: updatedText.content,
                level: "hard",
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        describe("If collection is invalid return 400", async () => {
            test<LocalTestContext>("If collection id is not a number return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({addedBy: author.profile, language, texts: []});
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const updatedText = context.textFactory.makeOne();

                const response = await makeRequest(text.id, {
                    collectionId: faker.random.alpha(3),
                    title: updatedText.title,
                    text: updatedText.content,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If collection does not exist return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({addedBy: author.profile, language, texts: []});
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const updatedText = context.textFactory.makeOne();

                const response = await makeRequest(text.id, {
                    collectionId: faker.datatype.number({min: 10000}),
                    title: updatedText.title,
                    text: updatedText.content,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If user is not author of collection return 403", async (context) => {
                const user = await context.userFactory.createOne();
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({addedBy: author.profile, language, texts: []});
                const newCollection = await context.collectionFactory.createOne({addedBy: author.profile, language, texts: []});
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const updatedText = context.textFactory.makeOne();

                const response = await makeRequest(text.id, {
                    collectionId: newCollection.id,
                    title: updatedText.title,
                    text: updatedText.content,
                }, session.token);
                expect(response.statusCode).to.equal(403);
            });
            test<LocalTestContext>("If collection is not in the same language as text return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language1 = await context.languageFactory.createOne();
                const language2 = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language1, texts: []});
                const newCollection = await context.collectionFactory.createOne({addedBy: author.profile, language: language2, texts: []});
                const text = await context.textFactory.createOne({collection, language: language1, addedBy: author.profile});
                const updatedText = context.textFactory.makeOne();

                const response = await makeRequest(text.id, {
                    data: {
                        collectionId: newCollection.id,
                        title: updatedText.title,
                        text: updatedText.content,
                    }
                }, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("If image is invalid return 400", async () => {
            test<LocalTestContext>("If file upload request with key does not exist return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({addedBy: author.profile, language, texts: []});
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const imageUploadRequest = await context.fileUploadRequestFactory.makeOne({user: author, fileField: "textImage"});
                const updatedText = context.textFactory.makeOne({collection, image: imageUploadRequest.fileUrl});

                const response = await makeRequest(text.id, {
                    title: updatedText.title,
                    text: updatedText.content,
                    image: imageUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If file upload request with key was not requested by user return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({addedBy: author.profile, language, texts: []});
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({user: otherUser, fileField: "textImage"});
                const updatedText = context.textFactory.makeOne({collection, image: imageUploadRequest.fileUrl});

                const response = await makeRequest(text.id, {
                    title: updatedText.title,
                    text: updatedText.content,
                    image: imageUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If file upload request with key is not for textImage field return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({addedBy: author.profile, language, texts: []});
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({user: otherUser, fileField: "collectionImage"});
                const updatedText = context.textFactory.makeOne({collection, image: imageUploadRequest.fileUrl});

                const response = await makeRequest(text.id, {
                    title: updatedText.title,
                    text: updatedText.content,
                    image: imageUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
        describe("If audio is invalid return 400", async () => {
            test<LocalTestContext>("If file upload request with key does not exist return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({addedBy: author.profile, language, texts: []});
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const audioUploadRequest = await context.fileUploadRequestFactory.makeOne({user: author, fileField: "textAudio"});
                const updatedText = context.textFactory.makeOne({collection, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest(text.id, {
                    title: updatedText.title,
                    text: updatedText.content,
                    audio: audioUploadRequest.objectKey
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If file upload request with key was not requested by user return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({addedBy: author.profile, language, texts: []});
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({user: otherUser, fileField: "textAudio"});
                const updatedText = context.textFactory.makeOne({collection, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest(text.id, {
                    title: updatedText.title,
                    text: updatedText.content,
                    audio: audioUploadRequest.objectKey
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If file upload request with key is not for textAudio field return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({addedBy: author.profile, language, texts: []});
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({user: otherUser, fileField: "collectionAudio"});
                const updatedText = context.textFactory.makeOne({collection, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest(text.id, {
                    title: updatedText.title,
                    text: updatedText.content,
                    audio: audioUploadRequest.objectKey
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
    });
});

/**{@link TextController#deleteText}*/
describe.todo("DELETE texts/:textId/", function () {
    test.todo<LocalTestContext>("");
});

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
    test<LocalTestContext>("If user is logged in and there are no filters return texts in user history", async (context) => {
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
        test<LocalTestContext>("If language filter is valid and language exists only return public texts in that language", async (context) => {
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
        test<LocalTestContext>("If language does not exist return empty list", async (context) => {
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
        test<LocalTestContext>("If language filter is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const response = await makeRequest({languageCode: 12345}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test addedBy filter", () => {
        test<LocalTestContext>("If addedBy filter is valid and user exists only return public texts added by that user", async (context) => {
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
        test<LocalTestContext>("If addedBy is me and signed in return texts added by that user", async (context) => {
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
        test<LocalTestContext>("If user does not exist return empty list", async (context) => {
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
        test<LocalTestContext>("If addedBy filter is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const response = await makeRequest({addedBy: "!@#%#%^#^!"}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test searchQuery filter", () => {
        test<LocalTestContext>("If searchQuery is valid return texts with query in title", async (context) => {
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
        test<LocalTestContext>("If searchQuery is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})}, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If no texts match search query return empty list", async (context) => {
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
        test<LocalTestContext>("If hasAudio is true return texts with audio", async (context) => {
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
        test<LocalTestContext>("If hasAudio is false return texts with no audio", async (context) => {
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
        test<LocalTestContext>("If hasAudio is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const response = await makeRequest({hasAudio: "maybe?"}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test sort", () => {
        describe("test sortBy", () => {
            test<LocalTestContext>("test sortBy title", async (context) => {
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
            test<LocalTestContext>("test sortBy createdDate", async (context) => {
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
            test<LocalTestContext>("test sortBy pastViewersCount", async (context) => {
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
            test<LocalTestContext>("test sortBy timeViewed", async (context) => {
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
            test<LocalTestContext>("if sortBy is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});

                const response = await makeRequest({sortBy: "text"}, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<LocalTestContext>("If sortOrder is asc return the texts in ascending order", async (context) => {
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
            test<LocalTestContext>("If sortOrder is desc return the texts in descending order", async (context) => {
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
            test<LocalTestContext>("If sortBy is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});

                const response = await makeRequest({sortOrder: "rising"}, session.token);
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
            test<LocalTestContext>("If page is 2 return the second page of results", async (context) => {
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
            test<LocalTestContext>("If page is last return the last page of results", async (context) => {
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
            test<LocalTestContext>("If page is more than last return empty page", async (context) => {
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
                test<LocalTestContext>("If page is less than 1 return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest({page: 0, pageSize: 3}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If page is not a number return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest({page: "last", pageSize: 3}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
            });
        });
        describe("test pageSize", () => {
            test<LocalTestContext>("If pageSize is 20 split the results into 20 sized pages", async (context) => {
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
                test<LocalTestContext>("If pageSize is too big return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest({page: 1, pageSize: 250}, session.token);
                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If pageSize is negative return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest({page: 1, pageSize: -20}, session.token);
                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If pageSize is not a number return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest({page: 1, pageSize: "a lot"}, session.token);
                    expect(response.statusCode).to.equal(400);
                });
            });
        });
    });
    test<LocalTestContext>("If user is not logged in return 401", async () => {
        const response = await makeRequest();
        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const response = await makeRequest({}, session.token);
        expect(response.statusCode).to.equal(403);
    });
});

/**{@link TextController#addTextToUserHistory}*/
describe("POST users/me/texts/history/", () => {
    const makeRequest = async (body: object, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `users/me/texts/history/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };
    test<LocalTestContext>("If the text exists and is public and user is learning text language add text to user's text history", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const expectedText = await context.textFactory.createOne({language, isPublic: true});
        await context.textRepo.annotateTextsWithUserData([expectedText], user);

        const response = await makeRequest({textId: expectedText.id}, session.token);

        expectedText.pastViewersCount++;
        expect(response.statusCode).to.equal(201);
        expect(response.json()).toEqual(textSerializer.serialize(expectedText));
        const dbRecord = await context.em.findOne(TextHistoryEntry, {
            pastViewer: user.profile, text: expectedText
        }, {populate: ["text"]});
        expect(dbRecord).not.toBeNull();
        expect(textSerializer.serialize(dbRecord!.text)).toEqual(textSerializer.serialize(expectedText));
    });
    test<LocalTestContext>("If text is already in user history add it again with newer timestamp", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const expectedText = await context.textFactory.createOne({language, isPublic: true, pastViewers: user.profile});
        await context.textRepo.annotateTextsWithUserData([expectedText], user);

        const response = await makeRequest({textId: expectedText.id}, session.token);

        expect(response.statusCode).to.equal(201);
        expect(response.json()).toEqual(textSerializer.serialize(expectedText));
        const dbRecords = await context.em.find(TextHistoryEntry, {
            pastViewer: user.profile, text: expectedText
        }, {populate: ["text"], orderBy: {timeViewed: "desc"}});
        expect(dbRecords).toHaveLength(2);
        expect(textSerializer.serialize(dbRecords[0].text)).toEqual(textSerializer.serialize(expectedText));
    });
    describe("If required fields are missing return 400", function () {
        test<LocalTestContext>("If the textId is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const response = await makeRequest({}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 400", function () {
        describe("If the text is invalid return 400", async () => {
            test<LocalTestContext>("If the textId is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest({textId: faker.random.alpha(10)}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If the text is not found return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest({textId: faker.datatype.number({min: 100000})}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If the text is not public and the user is logged in as author return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const author = await context.userFactory.createOne();
                const language = await context.languageFactory.createOne({learners: user.profile});
                const text = await context.textFactory.createOne({language, isPublic: false, addedBy: author.profile});

                const response = await makeRequest({textId: text.id}, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If the text is not in a language the user is learning return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const text = await context.textFactory.createOne({language, isPublic: true});

                const response = await makeRequest({textId: text.id}, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
    });
    test<LocalTestContext>("If user is not logged in return 401", async () => {
        const response = await makeRequest({});
        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language, isPublic: true});

        const response = await makeRequest({textId: text.id}, session.token);
        expect(response.statusCode).to.equal(403);
    });
});


/**{@link TextController#getUserBookmarkedTexts}*/
describe("GET users/me/texts/bookmarked/", () => {
    test.todo("");
});

/**{@link TextController#addTextToUserBookmarks}*/
describe("POST users/me/texts/bookmarked/", () => {
    test.todo("");
});

/**{@link TextController#addTextToUserBookmarks}*/
describe("DELETE users/me/texts/bookmarked/:textId", () => {
    test.todo("");
});

/**{@link TextController#getNextTextInCollection}*/
describe("GET collections/:collectionId/texts/:textId/next/", () => {
    const makeRequest = async (collectionId: string | number, textId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `collections/${collectionId}/texts/${textId}/next/`,
        };
        return await fetchRequest(options, authToken);
    };

    describe("If the collection and text exist and text is not last return redirect to next text in collection", async () => {
        test<LocalTestContext>("If text is public return redirect to next text in collection", async (context) => {
            const author = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({
                language,
                addedBy: author.profile,
                texts: context.textFactory.makeDefinitions(5, {language, addedBy: author.profile, isPublic: true})
            });
            const previousText = collection.texts[0];
            const expectedText = collection.texts[1];

            const response = await makeRequest(collection.id, previousText.id);

            expect(response.statusCode).to.equal(303);
            expect(response.headers.location).toEqual(`${API_ROOT}/texts/${expectedText.id}/`);
        });
        test<LocalTestContext>("If text is not public and user is not author skip text and redirect to next next text in collection", async (context) => {
            const language = await context.languageFactory.createOne();
            const author = await context.userFactory.createOne();
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const collection = await context.collectionFactory.createOne({
                language, addedBy: author.profile,
                texts: [
                    context.textFactory.makeDefinition({language, isPublic: true, addedBy: author.profile}),
                    context.textFactory.makeDefinition({language, isPublic: false, addedBy: author.profile}),
                    context.textFactory.makeDefinition({language, isPublic: true, addedBy: author.profile}),
                    context.textFactory.makeDefinition({language, isPublic: true, addedBy: author.profile})
                ]
            });
            const previousText = collection.texts[0];
            const expectedText = collection.texts[2];

            const response = await makeRequest(collection.id, previousText.id, session.token);

            expect(response.statusCode).to.equal(303);
            expect(response.headers.location).toEqual(`${API_ROOT}/texts/${expectedText.id}/`);
        });
        test<LocalTestContext>("If text is not public and user is author return redirect to next text in collection", async (context) => {
            const language = await context.languageFactory.createOne();
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const collection = await context.collectionFactory.createOne({
                language,
                addedBy: author.profile,
                texts: context.textFactory.makeDefinitions(5, {addedBy: author.profile, language, isPublic: false})
            });
            const previousText = collection.texts[0];
            const expectedText = collection.texts[1];

            const response = await makeRequest(collection.id, previousText.id, session.token);

            expect(response.statusCode).to.equal(303);
            expect(response.headers.location).toEqual(`${API_ROOT}/texts/${expectedText.id}/`);
        });
    });
    test<LocalTestContext>("If the collection does not exist return 404", async (context) => {
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({collection: await context.collectionFactory.createOne({language}), language, isPublic: true});
        const response = await makeRequest(Number(faker.random.numeric(8)), text.id);
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If the text does not exist return 404", async (context) => {
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({language, texts: context.textFactory.makeDefinitions(5, {language, isPublic: true})});
        const response = await makeRequest(collection.id, Number(faker.random.numeric(8)));

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If the text is last in collection return 404", async (context) => {
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({language, texts: context.textFactory.makeDefinitions(5, {language, isPublic: true})});
        const previousText = collection.texts[collection.texts.length - 1];

        const response = await makeRequest(collection.id, previousText.id);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If the text is last public one in collection and user is not author return 404", async (context) => {
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({
            language,
            texts: [
                ...context.textFactory.makeDefinitions(5, {language, isPublic: true}),
                context.textFactory.makeDefinition({language, isPublic: false})
            ]
        });
        const previousText = collection.texts[collection.texts.length - 2];

        const response = await makeRequest(collection.id, previousText.id);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If collection id is invalid return 400", async (context) => {
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({collection: await context.collectionFactory.createOne({language}), language, isPublic: true});

        const response = await makeRequest(faker.random.alpha(8), text.id);
        expect(response.statusCode).to.equal(400);
    });
    test<LocalTestContext>("If text id is invalid return 400", async (context) => {
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({language, texts: context.textFactory.makeDefinitions(5, {language, isPublic: true})});

        const response = await makeRequest(collection.id, faker.random.alpha(8));
        expect(response.statusCode).to.equal(400);
    });
});
