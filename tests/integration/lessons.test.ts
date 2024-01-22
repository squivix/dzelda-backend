import {beforeEach, describe, expect, test, TestContext, vi} from "vitest";
import {UserFactory} from "@/devtools/factories/UserFactory.js";
import {ProfileFactory} from "@/devtools/factories/ProfileFactory.js";
import {SessionFactory} from "@/devtools/factories/SessionFactory.js";
import {CourseRepo} from "@/src/models/repos/CourseRepo.js";
import {LessonRepo} from "@/src/models/repos/LessonRepo.js";
import {LanguageFactory} from "@/devtools/factories/LanguageFactory.js";
import {CourseFactory} from "@/devtools/factories/CourseFactory.js";
import {LessonFactory} from "@/devtools/factories/LessonFactory.js";
import {API_ROOT, orm} from "@/src/server.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {Course} from "@/src/models/entities/Course.js";
import {InjectOptions} from "light-my-request";
import {buildQueryString, createComparator, fetchRequest} from "@/tests/integration/utils.js";
import {lessonSerializer} from "@/src/presentation/response/serializers/entities/LessonSerializer.js";
import {faker} from "@faker-js/faker";
import {randomCase, randomEnum, randomEnums} from "@/tests/utils.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {EntityRepository} from "@mikro-orm/core";
import {MapLessonVocab} from "@/src/models/entities/MapLessonVocab.js";
import {MapPastViewerLesson} from "@/src/models/entities/MapPastViewerLesson.js";
import * as constantExports from "@/src/constants.js";
import {TEMP_ROOT_FILE_UPLOAD_DIR} from "@/tests/testConstants.js";
import {parsers} from "dzelda-common";
import {lessonHistoryEntrySerializer} from "@/src/presentation/response/serializers/mappings/LessonHistoryEntrySerializer.js";
import {FileUploadRequestFactory} from "@/devtools/factories/FileUploadRequestFactory.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";

interface LocalTestContext extends TestContext {
    languageFactory: LanguageFactory;
    lessonFactory: LessonFactory;
    courseFactory: CourseFactory;
    fileUploadRequestFactory: FileUploadRequestFactory;
    courseRepo: CourseRepo;
    lessonRepo: LessonRepo;
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
    context.lessonFactory = new LessonFactory(context.em);
    context.courseFactory = new CourseFactory(context.em);
    context.languageFactory = new LanguageFactory(context.em);
    context.fileUploadRequestFactory = new FileUploadRequestFactory(context.em);

    context.vocabRepo = context.em.getRepository(Vocab);
    context.lessonRepo = context.em.getRepository(Lesson) as LessonRepo;
    context.courseRepo = context.em.getRepository(Course) as CourseRepo;
    vi.spyOn(constantExports, "ROOT_UPLOAD_DIR", "get").mockReturnValue(TEMP_ROOT_FILE_UPLOAD_DIR);
});

/**{@link LessonController#getLessons}*/
describe("GET lessons/", () => {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `lessons/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const queryDefaults = {pagination: {pageSize: 10, page: 1}};
    const defaultSortComparator = createComparator(Lesson, [
        {property: "title", order: "asc"},
        {property: "id", order: "asc"}]
    );
    test<LocalTestContext>("If there are no filters and not logged in return all public lessons", async (context) => {
        const language = await context.languageFactory.createOne();
        const expectedLessons = await context.lessonFactory.create(3, {
            language: language,
            isPublic: true
        });
        await context.lessonFactory.create(3, {language: language, isPublic: false});
        expectedLessons.sort(defaultSortComparator);
        const recordsCount = expectedLessons.length;

        const response = await makeRequest();

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: lessonSerializer.serializeList(expectedLessons)
        });
    });
    describe("test languageCode filter", () => {
        test<LocalTestContext>("If language filter is valid and language exists only return public lessons in that language", async (context) => {
            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            const expectedLessons = await context.lessonFactory.create(3, {
                language: language1,
                isPublic: true
            });
            await context.lessonFactory.create(3, {language: language1, isPublic: false});
            await context.lessonFactory.create(3, {language: language2, isPublic: true});
            expectedLessons.sort(defaultSortComparator);
            const recordsCount = expectedLessons.length;

            const response = await makeRequest({languageCode: language1.code});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonSerializer.serializeList(expectedLessons)
            });
        });
        test<LocalTestContext>("If language does not exist return empty lessons list", async (context) => {
            await context.lessonFactory.create(3, {language: await context.languageFactory.createOne()});

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
        test<LocalTestContext>("If the level is valid return lessons in that level", async (context) => {
            const level = randomEnum(LanguageLevel);
            const language = await context.languageFactory.createOne();
            const expectedLessons = await context.lessonFactory.create(3, {language, isPublic: true, level: level});
            await context.lessonFactory.create(3, {language, level: level, isPublic: false});
            await context.lessonFactory.create(3, {language, level: randomEnum(LanguageLevel, [level]), isPublic: true});
            expectedLessons.sort(defaultSortComparator);
            const recordsCount = expectedLessons.length;

            const response = await makeRequest({level: level});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonSerializer.serializeList(expectedLessons)
            });
        });
        test<LocalTestContext>("If multiple levels are sent return lessons in any of those levels", async (context) => {
            const levels = randomEnums(2, LanguageLevel);
            const language = await context.languageFactory.createOne();

            const expectedLessons = (await Promise.all(levels.map(level => context.lessonFactory.create(3, {language, isPublic: true, level: level})))).flat();
            await Promise.all(levels.map(level => context.lessonFactory.create(3, {language, isPublic: false, level: level})));
            await context.lessonFactory.create(3, {language, level: randomEnum(LanguageLevel, levels), isPublic: true});
            expectedLessons.sort(defaultSortComparator);
            const recordsCount = expectedLessons.length;

            const response = await makeRequest({level: levels});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonSerializer.serializeList(expectedLessons)
            });
        });
        test<LocalTestContext>("If the level is invalid return 400", async () => {
            const response = await makeRequest({level: "hard"});

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test addedBy filter", () => {
        test<LocalTestContext>("If addedBy filter is valid and user exists only return public lessons added by that user", async (context) => {
            const user1 = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const expectedLessons = await context.lessonFactory.create(3, {
                language: language,
                addedBy: user1.profile
            });
            await context.lessonFactory.create(3, {language: language});
            expectedLessons.sort(defaultSortComparator);
            const recordsCount = expectedLessons.length;

            const response = await makeRequest({addedBy: user1.username});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonSerializer.serializeList(expectedLessons)
            });
        });
        test<LocalTestContext>("If addedBy is me and signed in return lessons added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();
            const expectedLessons = await context.lessonFactory.create(3, {
                language: language,
                addedBy: user.profile
            });
            await context.lessonFactory.create(3, {language: language});
            await context.lessonRepo.annotateLessonsWithUserData(expectedLessons, user);
            expectedLessons.sort(defaultSortComparator);
            const recordsCount = expectedLessons.length;

            const response = await makeRequest({addedBy: "me"}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonSerializer.serializeList(expectedLessons)
            });
        });
        test<LocalTestContext>("If addedBy is me and not signed in return 401", async (context) => {
            const response = await makeRequest({addedBy: "me"});
            expect(response.statusCode).to.equal(401);
        });
        test<LocalTestContext>("If user does not exist return empty lesson list", async (context) => {
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
        test<LocalTestContext>("If searchQuery is valid return lessons with query in title", async (context) => {
            const language = await context.languageFactory.createOne();
            const searchQuery = "search query";
            const expectedLessons = [
                await context.lessonFactory.createOne({language, title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`}),
                await context.lessonFactory.createOne({language, title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`}),
                await context.lessonFactory.createOne({language, title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`})
            ];
            await context.lessonFactory.create(3, {language});
            expectedLessons.sort(defaultSortComparator);
            const recordsCount = expectedLessons.length;

            const response = await makeRequest({searchQuery: searchQuery});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonSerializer.serializeList(expectedLessons)
            });
        });
        test<LocalTestContext>("If searchQuery is invalid return 400", async () => {
            const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})});

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If no lessons match search query return empty list", async (context) => {
            await context.lessonFactory.create(3, {language: await context.languageFactory.createOne()});

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
        test<LocalTestContext>("If hasAudio is true return lessons with audio", async (context) => {
            const language = await context.languageFactory.createOne();
            const expectedLessons = await context.lessonFactory.create(3, {
                language, isPublic: true,
                audio: "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg"
            });
            await context.lessonFactory.create(3, {
                language: language, isPublic: true,
                audio: ""
            });
            expectedLessons.sort(defaultSortComparator);
            const recordsCount = expectedLessons.length;

            const response = await makeRequest({hasAudio: true});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonSerializer.serializeList(expectedLessons)
            });
        });
        test<LocalTestContext>("If hasAudio is false return lessons with no audio", async (context) => {
            const language = await context.languageFactory.createOne();
            const expectedLessons = await context.lessonFactory.create(3, {
                language: language, isPublic: true,
                audio: ""
            });
            await context.lessonFactory.create(3, {
                language, isPublic: true,
                audio: "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg"
            });

            expectedLessons.sort(defaultSortComparator);
            const recordsCount = expectedLessons.length;

            const response = await makeRequest({hasAudio: false});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonSerializer.serializeList(expectedLessons)
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
                const expectedLessons = [
                    await context.lessonFactory.createOne({language, title: "abc"}),
                    await context.lessonFactory.createOne({language, title: "def"})
                ];
                const recordsCount = expectedLessons.length;

                const response = await makeRequest({sortBy: "title"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: lessonSerializer.serializeList(expectedLessons)
                });
            });
            test<LocalTestContext>("test sortBy createdDate", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedLessons = [
                    await context.lessonFactory.createOne({language, addedOn: new Date("2018-07-22T10:30:45.000Z")}),
                    await context.lessonFactory.createOne({language, addedOn: new Date("2023-03-15T20:29:42.000Z")})
                ];
                const recordsCount = expectedLessons.length;

                const response = await makeRequest({sortBy: "createdDate"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: lessonSerializer.serializeList(expectedLessons)
                });
            });
            test<LocalTestContext>("test sortBy pastViewersCount", async (context) => {
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();
                const language = await context.languageFactory.createOne();
                const expectedLessons = [
                    await context.lessonFactory.createOne({language, pastViewers: []}),
                    await context.lessonFactory.createOne({language, pastViewers: [user1.profile]}),
                    await context.lessonFactory.createOne({language, pastViewers: [user1.profile, user2.profile]}),
                ];
                const recordsCount = expectedLessons.length;

                const response = await makeRequest({sortBy: "pastViewersCount", sortOrder: "asc"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: lessonSerializer.serializeList(expectedLessons)
                });
            });
            test<LocalTestContext>("if sortBy is invalid return 400", async (context) => {
                const response = await makeRequest({sortBy: "text"});
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<LocalTestContext>("If sortOrder is asc return the lessons in ascending order", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedLessons = [
                    await context.lessonFactory.createOne({language, title: "abc"}),
                    await context.lessonFactory.createOne({language, title: "def"})
                ];
                const recordsCount = expectedLessons.length;

                const response = await makeRequest({sortOrder: "asc"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: lessonSerializer.serializeList(expectedLessons)
                });
            });
            test<LocalTestContext>("If sortOrder is desc return the lessons in descending order", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedLessons = [
                    await context.lessonFactory.createOne({language, title: "def"}),
                    await context.lessonFactory.createOne({language, title: "abc"}),
                ];
                const recordsCount = expectedLessons.length;

                const response = await makeRequest({sortOrder: "desc"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: lessonSerializer.serializeList(expectedLessons)
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
                const allLessons = await context.lessonFactory.create(10, {
                    language,
                    isPublic: true
                });
                allLessons.sort(defaultSortComparator);
                const recordsCount = allLessons.length;
                const page = 1, pageSize = 3;
                const expectedLessons = allLessons.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: lessonSerializer.serializeList(expectedLessons)
                });
            });
            test<LocalTestContext>("If page is 2 return the second page of results", async (context) => {
                const language = await context.languageFactory.createOne();
                const allLessons = await context.lessonFactory.create(10, {
                    language,
                    isPublic: true
                });
                allLessons.sort(defaultSortComparator);
                const recordsCount = allLessons.length;
                const page = 1, pageSize = 3;
                const expectedLessons = allLessons.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: lessonSerializer.serializeList(expectedLessons)
                });
            });
            test<LocalTestContext>("If page is last return the last page of results", async (context) => {
                const language = await context.languageFactory.createOne();
                const allLessons = await context.lessonFactory.create(10, {
                    language,
                    isPublic: true
                });
                allLessons.sort(defaultSortComparator);
                const recordsCount = allLessons.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedLessons = allLessons.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: lessonSerializer.serializeList(expectedLessons)
                });
            });
            test<LocalTestContext>("If page is more than last return empty page", async (context) => {
                const language = await context.languageFactory.createOne();
                const allLessons = await context.lessonFactory.create(10, {
                    language,
                    isPublic: true
                });
                allLessons.sort(defaultSortComparator);
                const recordsCount = allLessons.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize) + 1;
                const expectedLessons = allLessons.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

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
                const allLessons = await context.lessonFactory.create(50, {
                    language,
                    isPublic: true
                });
                allLessons.sort(defaultSortComparator);
                const recordsCount = allLessons.length;
                const pageSize = 20;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedLessons = allLessons.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: lessonSerializer.serializeList(expectedLessons)
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
    test<LocalTestContext>("If logged in return lessons with vocab levels for user", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const expectedLessons = await context.lessonFactory.create(3, {
            language: language,
            isPublic: true
        });
        context.lessonRepo.annotateLessonsWithUserData(expectedLessons, user);
        await context.lessonFactory.create(3, {language: language, isPublic: false});
        expectedLessons.sort(defaultSortComparator);
        const recordsCount = expectedLessons.length;

        const response = await makeRequest({}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: lessonSerializer.serializeList(expectedLessons)
        });
    });
    test<LocalTestContext>("If logged in as author of lesson courses return private lessons", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const expectedLessons = [
            ...await context.lessonFactory.create(3, {language, isPublic: true}),
            ...await context.lessonFactory.create(3, {
                language,
                isPublic: false,
                addedBy: user.profile
            }),
        ];
        context.lessonRepo.annotateLessonsWithUserData(expectedLessons, user);
        await context.lessonFactory.create(3, {language: language, isPublic: false});
        expectedLessons.sort(defaultSortComparator);
        const recordsCount = expectedLessons.length;

        const response = await makeRequest({}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: lessonSerializer.serializeList(expectedLessons)
        });
    });
});

/**{@link LessonController#createLesson}*/
describe("POST lessons/", () => {
    const makeRequest = async (body: object, authToken?: string) => {
        return await fetchRequest({
            method: "POST",
            url: "lessons/",
            body: body,
        }, authToken);
    };

    describe("If all fields are valid a new lesson should be created and return 201", () => {
        test<LocalTestContext>("If optional fields are missing use default values", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newLesson = context.lessonFactory.makeOne({level: LanguageLevel.ADVANCED_1, image: "", audio: ""});

            const response = await makeRequest({
                languageCode: language.code,
                title: newLesson.title,
                text: newLesson.text,
            }, session.token);

            expect(response.statusCode).to.equal(201);
            const dbRecord = await context.lessonRepo.findOne({language: language, title: newLesson.title}, {populate: ["course", "course.language", "course.addedBy.user", "addedBy.user"]});
            expect(dbRecord).not.toBeNull();
            if (!dbRecord) return;
            await context.lessonRepo.annotateLessonsWithUserData([dbRecord], user);
            expect(response.json()).toMatchObject(lessonSerializer.serialize(newLesson, {ignore: ["addedOn"]}));
            expect(lessonSerializer.serialize(dbRecord)).toMatchObject(lessonSerializer.serialize(newLesson, {ignore: ["addedOn"]}));
            const parser = parsers["en"];
            const lessonWordsText = parser.splitWords(parser.parseText(`${newLesson.title} ${newLesson.text}`), {keepDuplicates: false});
            const lessonVocabs = await context.vocabRepo.find({text: lessonWordsText, language: language});
            const lessonVocabMappings = await context.em.find(MapLessonVocab, {vocab: lessonVocabs, lesson: dbRecord});

            expect(lessonVocabs.length).toEqual(lessonWordsText.length);
            expect(lessonVocabs.map(v => v.text)).toEqual(expect.arrayContaining(lessonWordsText));
            expect(lessonVocabMappings.length).toEqual(lessonWordsText.length);
        });
        test<LocalTestContext>("If optional fields are provided use provided values", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({language: language, addedBy: user.profile, lessons: []});
            const imageUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "lessonImage"});
            const audioUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "lessonAudio"});
            const newLesson = context.lessonFactory.makeOne({
                language: language,
                image: imageUploadRequest.fileUrl,
                audio: audioUploadRequest.fileUrl,
                addedBy: user.profile,
                course: course,
                isPublic: false,
                level: LanguageLevel.BEGINNER_2,
            });

            const response = await makeRequest({
                languageCode: language.code,
                title: newLesson.title,
                text: newLesson.text,
                courseId: course.id,
                isPublic: newLesson.isPublic,
                level: newLesson.level,
                image: imageUploadRequest.objectKey,
                audio: audioUploadRequest.objectKey,
            }, session.token);

            expect(response.statusCode).to.equal(201);
            const dbRecord = await context.lessonRepo.findOne({course: course, title: newLesson.title}, {populate: ["course", "course.language", "course.addedBy.user", "language", "addedBy.user"]});
            expect(dbRecord).not.toBeNull();
            if (!dbRecord) return;
            await context.lessonRepo.annotateLessonsWithUserData([dbRecord], user);
            await context.courseRepo.annotateCoursesWithUserData([dbRecord.course!], user);
            expect(response.json()).toMatchObject(lessonSerializer.serialize(newLesson, {ignore: ["addedOn"]}));
            expect(lessonSerializer.serialize(dbRecord)).toMatchObject(lessonSerializer.serialize(newLesson, {ignore: ["addedOn",]}));

            const parser = parsers["en"];
            const lessonWordsText = parser.splitWords(parser.parseText(`${newLesson.title} ${newLesson.text}`), {keepDuplicates: false});
            const lessonVocabs = await context.vocabRepo.find({text: lessonWordsText, language: course.language});
            const lessonVocabMappings = await context.em.find(MapLessonVocab, {vocab: lessonVocabs, lesson: dbRecord});

            expect(lessonVocabs.length).toEqual(lessonWordsText.length);
            expect(lessonVocabs.map(v => v.text)).toEqual(expect.arrayContaining(lessonWordsText));
            expect(lessonVocabMappings.length).toEqual(lessonWordsText.length);
        });
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const language = await context.languageFactory.createOne();
        const newLesson = context.lessonFactory.makeOne({language});

        const response = await makeRequest({
            languageCode: newLesson.language.code,
            title: newLesson.title,
            text: newLesson.text,
        });

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const newLesson = context.lessonFactory.makeOne({language});

        const response = await makeRequest({
            languageCode: newLesson.language.code,
            title: newLesson.title,
            text: newLesson.text,
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
    describe("If required fields are missing return 400", async () => {
        test<LocalTestContext>("If title is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newLesson = context.lessonFactory.makeOne({language});

            const response = await makeRequest({
                languageCode: newLesson.language.code,
                text: newLesson.text,
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If text is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newLesson = context.lessonFactory.makeOne({language});

            const response = await makeRequest({
                languageCode: newLesson.language.code,
                title: newLesson.title,
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If languageCode is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newLesson = context.lessonFactory.makeOne({language});

            const response = await makeRequest({
                title: newLesson.title,
                text: newLesson.text,
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 400", async () => {
        test<LocalTestContext>("If title is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newLesson = context.lessonFactory.makeOne({language});

            const response = await makeRequest({
                languageCode: newLesson.language.code,
                title: faker.random.alphaNumeric(200),
                text: newLesson.text,
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If text is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newLesson = context.lessonFactory.makeOne({language});

            const response = await makeRequest({
                languageCode: newLesson.language.code,
                title: newLesson.text,
                text: faker.random.words(40000),
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        describe("If course is invalid return 400", async () => {
            test<LocalTestContext>("If course id is not a number return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newLesson = context.lessonFactory.makeOne({language});

                const response = await makeRequest({
                    languageCode: newLesson.language.code,
                    title: newLesson.title,
                    text: newLesson.text,
                    courseId: faker.random.alpha(3),
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If course does not exist return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newLesson = context.lessonFactory.makeOne({language});

                const response = await makeRequest({
                    languageCode: newLesson.language.code,
                    title: newLesson.title,
                    text: newLesson.text,
                    courseId: faker.datatype.number({min: 10000}),
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If course is in a different language than lesson return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language1 = await context.languageFactory.createOne();
                const language2 = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language: language1});
                const newLesson = context.lessonFactory.makeOne({language: language2});

                const response = await makeRequest({
                    languageCode: newLesson.language.code,
                    title: newLesson.title,
                    text: newLesson.text,
                    courseId: course.id,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If user is not author of course return 403", async (context) => {
                const user = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language, addedBy: otherUser.profile, lessons: []});
                const newLesson = context.lessonFactory.makeOne({language, course});

                const response = await makeRequest({
                    languageCode: newLesson.language.code,
                    title: newLesson.title,
                    text: newLesson.text,
                    courseId: course.id,
                }, session.token);

                expect(response.statusCode).to.equal(403);
            });

        });
        describe("If image is invalid return 400", async () => {
            test<LocalTestContext>("If file upload request with key does not exist return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const imageUploadRequest = await context.fileUploadRequestFactory.makeOne({user: user, fileField: "lessonImage"});
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "lessonAudio"});
                const newLesson = context.lessonFactory.makeOne({language, image: imageUploadRequest.fileUrl, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest({
                    languageCode: newLesson.language.code,
                    title: newLesson.title,
                    text: newLesson.text,
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
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({user: otherUser, fileField: "lessonImage"});
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "lessonAudio"});
                const newLesson = context.lessonFactory.makeOne({language, image: imageUploadRequest.fileUrl, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest({
                    languageCode: newLesson.language.code,
                    title: newLesson.title,
                    text: newLesson.text,
                    image: imageUploadRequest.objectKey,
                    audio: audioUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If file upload request with key is not for lessonImage field return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "courseImage"});
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "lessonAudio"});
                const newLesson = context.lessonFactory.makeOne({language, image: imageUploadRequest.fileUrl, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest({
                    languageCode: newLesson.language.code,
                    title: newLesson.title,
                    text: newLesson.text,
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
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "lessonImage"});
                const audioUploadRequest = await context.fileUploadRequestFactory.makeOne({user: user, fileField: "lessonAudio"});
                const newLesson = context.lessonFactory.makeOne({language, image: imageUploadRequest.fileUrl, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest({
                    languageCode: newLesson.language.code,
                    title: newLesson.title,
                    text: newLesson.text,
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
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "lessonImage"});
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({user: otherUser, fileField: "lessonAudio"});
                const newLesson = context.lessonFactory.makeOne({language, image: imageUploadRequest.fileUrl, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest({
                    languageCode: newLesson.language.code,
                    title: newLesson.title,
                    text: newLesson.text,
                    image: imageUploadRequest.objectKey,
                    audio: audioUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If file upload request with key is not for lessonAudio field return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "lessonImage"});
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "courseAudio"});
                const newLesson = context.lessonFactory.makeOne({language, image: imageUploadRequest.fileUrl, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest({
                    languageCode: newLesson.language.code,
                    title: newLesson.title,
                    text: newLesson.text,
                    image: imageUploadRequest.objectKey,
                    audio: audioUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
    });
});

/**{@link LessonController#getLesson}*/
describe("GET lessons/:lessonId/", () => {
    const makeRequest = async (lessonId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `lessons/${lessonId}/`,
        };
        return await fetchRequest(options, authToken);
    };

    describe("If the lesson exists and is public return the lesson", () => {
        test<LocalTestContext>("If the user is not logged in return lesson without vocab levels", async (context) => {
            const language = await context.languageFactory.createOne();
            const expectedLesson = await context.lessonFactory.createOne({language, isPublic: true});

            const response = await makeRequest(expectedLesson.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serialize(expectedLesson));
        });
        test<LocalTestContext>("If the user is logged in return lesson with vocab levels", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const expectedLesson = await context.lessonFactory.createOne({language, isPublic: true});
            await context.lessonRepo.annotateLessonsWithUserData([expectedLesson], user);

            const response = await makeRequest(expectedLesson.id, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serialize(expectedLesson));
        });
    });
    test<LocalTestContext>("If the lesson does not exist return 404", async () => {
        const response = await makeRequest(Number(faker.random.numeric(8)));
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If lesson id is invalid return 400", async () => {
        const response = await makeRequest(faker.random.alpha(8));
        expect(response.statusCode).to.equal(400);
    });
    test<LocalTestContext>("If the lesson is not public and the user is not logged in return 404", async (context) => {
        const language = await context.languageFactory.createOne();
        const lesson = await context.lessonFactory.createOne({language, isPublic: false});

        const response = await makeRequest(lesson.id);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If the lesson is not public and the user is logged in as a non-author return 404", async (context) => {
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const lesson = await context.lessonFactory.createOne({language, isPublic: false, addedBy: author.profile});
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: otherUser});

        const response = await makeRequest(lesson.id, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If the lesson is not public and the user is logged in as author return lesson with vocabs by level", async (context) => {
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const lesson = await context.lessonFactory.createOne({language, isPublic: false, addedBy: author.profile});
        const session = await context.sessionFactory.createOne({user: author});

        const response = await makeRequest(lesson.id, session.token);

        await context.lessonRepo.annotateLessonsWithUserData([lesson], author);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(lessonSerializer.serialize(lesson));
    });
});

/**{@link LessonController#updateLesson}*/
describe("PATCH lessons/:lessonId/", () => {
    const makeRequest = async (lessonId: number | string, body: object, authToken?: string) => {
        return await fetchRequest({
            method: "PATCH",
            url: `lessons/${lessonId}/`,
            body: body,
        }, authToken);
    };

    describe("If the lesson exists, user is logged in as author and all fields are valid, update lesson and return 200", async () => {
        test<LocalTestContext>("If optional field are not provided, keep old values", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();

            const course = await context.courseFactory.createOne({addedBy: author.profile, language: language});
            const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});

            const updatedLesson = context.lessonFactory.makeOne({course, level: lesson.level});

            const response = await makeRequest(lesson.id, {
                title: updatedLesson.title,
                text: updatedLesson.text
            }, session.token);

            const dbRecord = await context.lessonRepo.findOneOrFail({id: lesson.id}, {populate: ["course", "course.language", "course.addedBy.user"]});
            await context.lessonRepo.annotateLessonsWithUserData([dbRecord], author);
            await context.courseRepo.annotateCoursesWithUserData([dbRecord.course!], author);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toMatchObject(lessonSerializer.serialize(updatedLesson, {ignore: []}));
            expect(lessonSerializer.serialize(dbRecord)).toMatchObject(lessonSerializer.serialize(updatedLesson, {ignore: []}));

            const parser = parsers["en"];
            const lessonWordsText = parser.splitWords(parser.parseText(`${updatedLesson.title} ${updatedLesson.text}`), {keepDuplicates: false});
            const lessonVocabs = await context.vocabRepo.find({text: lessonWordsText, language: course.language});
            const lessonVocabMappings = await context.em.find(MapLessonVocab, {vocab: lessonVocabs, lesson: dbRecord});

            expect(lessonVocabs.length).toEqual(lessonWordsText.length);
            expect(lessonVocabs.map(v => v.text)).toEqual(expect.arrayContaining(lessonWordsText));
            expect(lessonVocabMappings.length).toEqual(lessonWordsText.length);
        });
        describe("If optional fields are provided, update their values", async () => {
            test<LocalTestContext>("If new image and audio are provided, update them", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();

                const course = await context.courseFactory.createOne({addedBy: author.profile, language, lessons: []});
                const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({user: author, fileField: "lessonImage"});
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({user: author, fileField: "lessonAudio"});
                const updatedLesson = context.lessonFactory.makeOne({course, image: imageUploadRequest.fileUrl, audio: audioUploadRequest.fileUrl, isPublic: !lesson.isPublic});

                const response = await makeRequest(lesson.id, {
                    title: updatedLesson.title,
                    text: updatedLesson.text,
                    isPublic: updatedLesson.isPublic,
                    level: updatedLesson.level,
                    image: imageUploadRequest.objectKey,
                    audio: audioUploadRequest.objectKey,
                }, session.token);

                const dbRecord = await context.lessonRepo.findOneOrFail({id: lesson.id}, {populate: ["course", "course.language", "course.addedBy.user"]});
                await context.em.populate(dbRecord, ["course"]);
                await context.lessonRepo.annotateLessonsWithUserData([dbRecord], author);
                await context.courseRepo.annotateCoursesWithUserData([updatedLesson.course!], author);
                await context.courseRepo.annotateCoursesWithUserData([dbRecord.course!], author);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toMatchObject(lessonSerializer.serialize(updatedLesson, {ignore: ["addedOn"]}));
                expect(lessonSerializer.serialize(dbRecord)).toMatchObject(lessonSerializer.serialize(updatedLesson, {ignore: ["addedOn"]}));

                const parser = parsers["en"];
                const lessonWordsText = parser.splitWords(parser.parseText(`${updatedLesson.title} ${updatedLesson.text}`), {keepDuplicates: false});
                const lessonVocabs = await context.vocabRepo.find({text: lessonWordsText, language: course.language});
                const lessonVocabMappings = await context.em.find(MapLessonVocab, {vocab: lessonVocabs, lesson: dbRecord});

                expect(lessonVocabs.length).toEqual(lessonWordsText.length);
                expect(lessonVocabMappings.length).toEqual(lessonWordsText.length);
            });
            test<LocalTestContext>("If new image and audio are blank clear lesson image and audio", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();

                const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
                const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});
                const updatedLesson = context.lessonFactory.makeOne({course, image: "", audio: "", isPublic: !lesson.isPublic});

                const response = await makeRequest(lesson.id, {
                    title: updatedLesson.title,
                    text: updatedLesson.text,
                    isPublic: updatedLesson.isPublic,
                    level: updatedLesson.level,
                    image: "",
                    audio: ""
                }, session.token);

                const dbRecord = await context.lessonRepo.findOneOrFail({id: lesson.id}, {populate: ["course", "course.language", "course.addedBy.user"]});
                await context.em.populate(dbRecord, ["course"]);
                await context.lessonRepo.annotateLessonsWithUserData([dbRecord], author);
                await context.courseRepo.annotateCoursesWithUserData([dbRecord.course!], author);
                await context.courseRepo.annotateCoursesWithUserData([updatedLesson.course!], author);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toMatchObject(lessonSerializer.serialize(updatedLesson, {ignore: ["addedOn"]}));
                expect(lessonSerializer.serialize(dbRecord)).toMatchObject(lessonSerializer.serialize(updatedLesson, {ignore: ["addedOn"]}));

                const parser = parsers["en"];
                const lessonWordsText = parser.splitWords(parser.parseText(`${updatedLesson.title} ${updatedLesson.text}`), {keepDuplicates: false});
                const lessonVocabs = await context.vocabRepo.find({text: lessonWordsText, language: course.language});
                const lessonVocabMappings = await context.em.find(MapLessonVocab, {vocab: lessonVocabs, lesson: dbRecord});

                expect(lessonVocabs.length).toEqual(lessonWordsText.length);
                expect(lessonVocabs.map(v => v.text)).toEqual(expect.arrayContaining(lessonWordsText));
                expect(lessonVocabMappings.length).toEqual(lessonWordsText.length);
            });
            test<LocalTestContext>("If courseId is provided change course", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();

                const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
                const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
                const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});
                const updatedLesson = context.lessonFactory.makeOne({course: newCourse, isPublic: !lesson.isPublic});

                const response = await makeRequest(lesson.id, {
                    courseId: newCourse.id,
                    title: updatedLesson.title,
                    text: updatedLesson.text,
                    isPublic: updatedLesson.isPublic,
                    level: updatedLesson.level,
                }, session.token);

                const dbRecord = await context.lessonRepo.findOneOrFail({id: lesson.id}, {populate: ["course", "course.language", "course.addedBy.user"]});
                await context.em.populate(dbRecord, ["course"]);
                await context.lessonRepo.annotateLessonsWithUserData([dbRecord], author);
                await context.courseRepo.annotateCoursesWithUserData([updatedLesson.course!], author);
                await context.courseRepo.annotateCoursesWithUserData([dbRecord.course!], author);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toMatchObject(lessonSerializer.serialize(updatedLesson, {ignore: ["addedOn"]}));
                expect(lessonSerializer.serialize(dbRecord)).toMatchObject(lessonSerializer.serialize(updatedLesson, {ignore: ["addedOn"]}));
                expect(dbRecord.orderInCourse).toEqual(await newCourse.lessons.loadCount() - 1);

                const parser = parsers["en"];
                const lessonWordsText = parser.splitWords(parser.parseText(`${updatedLesson.title} ${updatedLesson.text}`), {keepDuplicates: false});
                const lessonVocabs = await context.vocabRepo.find({text: lessonWordsText, language: course.language});
                const lessonVocabMappings = await context.em.find(MapLessonVocab, {vocab: lessonVocabs, lesson: dbRecord});

                expect(lessonVocabs.length).toEqual(lessonWordsText.length);
                expect(lessonVocabMappings.length).toEqual(lessonWordsText.length);
            });
            test<LocalTestContext>("If courseId is null set remove from course", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();

                const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
                const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});
                const updatedLesson = context.lessonFactory.makeOne({course: null, isPublic: !lesson.isPublic});

                const response = await makeRequest(lesson.id, {
                    courseId: null,
                    title: updatedLesson.title,
                    text: updatedLesson.text,
                    isPublic: updatedLesson.isPublic,
                    level: updatedLesson.level,
                }, session.token);

                const dbRecord = await context.lessonRepo.findOneOrFail({id: lesson.id}, {populate: ["course", "course.language", "course.addedBy.user"]});
                await context.em.populate(dbRecord, ["course"]);
                await context.lessonRepo.annotateLessonsWithUserData([dbRecord], author);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toMatchObject(lessonSerializer.serialize(updatedLesson, {ignore: ["addedOn"]}));
                expect(lessonSerializer.serialize(dbRecord)).toMatchObject(lessonSerializer.serialize(updatedLesson, {ignore: ["addedOn"]}));
                expect(dbRecord.orderInCourse).toEqual(null);

                const parser = parsers["en"];
                const lessonWordsText = parser.splitWords(parser.parseText(`${updatedLesson.title} ${updatedLesson.text}`), {keepDuplicates: false});
                const lessonVocabs = await context.vocabRepo.find({text: lessonWordsText, language: course.language});
                const lessonVocabMappings = await context.em.find(MapLessonVocab, {vocab: lessonVocabs, lesson: dbRecord});

                expect(lessonVocabs.length).toEqual(lessonWordsText.length);
                expect(lessonVocabMappings.length).toEqual(lessonWordsText.length);
            });
        });
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
        const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});
        const updatedLesson = context.lessonFactory.makeOne({course});

        const response = await makeRequest(lesson.id, {
            title: updatedLesson.title,
            text: updatedLesson.text,
        });

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
        const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});
        const updatedLesson = context.lessonFactory.makeOne({course});

        const response = await makeRequest(lesson.id, {
            title: updatedLesson.title,
            text: updatedLesson.text,
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
    test<LocalTestContext>("If lesson does not exist return 404", async (context) => {
        const author = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: author});
        const updatedLesson = await context.lessonFactory.makeOne();

        const response = await makeRequest(faker.random.numeric(20), {
            title: updatedLesson.title,
            text: updatedLesson.text,
        }, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If lesson is not public and user is not author return 404", async (context) => {
        const author = await context.userFactory.createOne();
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: otherUser});
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
        const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile, isPublic: false,});
        const updatedLesson = context.lessonFactory.makeOne();

        const response = await makeRequest(lesson.id, {
            title: updatedLesson.title,
            text: updatedLesson.text,
        }, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If lesson is public and user is not author of lesson course return 403", async (context) => {
        const author = await context.userFactory.createOne();
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: otherUser});
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
        const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile, isPublic: true});
        const updatedLesson = context.lessonFactory.makeOne();

        const response = await makeRequest(lesson.id, {
            title: updatedLesson.title,
            text: updatedLesson.text,
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
    describe("If required fields are missing return 400", async () => {
        test<LocalTestContext>("If title is missing return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({addedBy: author.profile, language, lessons: []});
            const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});

            const updatedLesson = context.lessonFactory.makeOne();

            const response = await makeRequest(lesson.id, {
                text: updatedLesson.text,
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If text is missing return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({addedBy: author.profile, language, lessons: []});
            const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});

            const updatedLesson = context.lessonFactory.makeOne();

            const response = await makeRequest(lesson.id, {
                title: updatedLesson.title,
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 400", async () => {
        test<LocalTestContext>("If title is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({addedBy: author.profile, language, lessons: []});
            const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});
            const updatedLesson = context.lessonFactory.makeOne({course: course});

            const response = await makeRequest(lesson.id, {
                title: faker.random.alpha({count: 150}),
                text: updatedLesson.text,
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If text is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({addedBy: author.profile, language, lessons: []});
            const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});
            const updatedLesson = context.lessonFactory.makeOne({course: course});

            const response = await makeRequest(lesson.id, {
                title: updatedLesson.title,
                text: faker.random.alpha({count: 60_000}),
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If isPublic is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({addedBy: author.profile, language, lessons: []});
            const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});
            const updatedLesson = context.lessonFactory.makeOne({course: course});

            const response = await makeRequest(lesson.id, {
                title: updatedLesson.title,
                text: updatedLesson.text,
                isPublic: "kinda?"
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If level is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({addedBy: author.profile, language, lessons: []});
            const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});
            const updatedLesson = context.lessonFactory.makeOne({course});

            const response = await makeRequest(lesson.id, {
                title: updatedLesson.title,
                text: updatedLesson.text,
                level: "hard",
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        describe("If course is invalid return 400", async () => {
            test<LocalTestContext>("If course id is not a number return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: author.profile, language, lessons: []});
                const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});
                const updatedLesson = context.lessonFactory.makeOne({course});

                const response = await makeRequest(lesson.id, {
                    courseId: faker.random.alpha(3),
                    title: updatedLesson.title,
                    text: updatedLesson.text,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If course does not exist return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: author.profile, language, lessons: []});
                const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});
                const updatedLesson = context.lessonFactory.makeOne({course});

                const response = await makeRequest(lesson.id, {
                    courseId: faker.datatype.number({min: 10000}),
                    title: updatedLesson.title,
                    text: updatedLesson.text,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If user is not author of course return 403", async (context) => {
                const user = await context.userFactory.createOne();
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: author.profile, language, lessons: []});
                const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language, lessons: []});
                const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});
                const updatedLesson = context.lessonFactory.makeOne({course});

                const response = await makeRequest(lesson.id, {
                    courseId: newCourse.id,
                    title: updatedLesson.title,
                    text: updatedLesson.text,
                }, session.token);
                expect(response.statusCode).to.equal(403);
            });
            test<LocalTestContext>("If course is not in the same language as lesson return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language1 = await context.languageFactory.createOne();
                const language2 = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: author.profile, language: language1, lessons: []});
                const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language2, lessons: []});
                const lesson = await context.lessonFactory.createOne({course, language: language1, addedBy: author.profile});
                const updatedLesson = context.lessonFactory.makeOne({course});

                const response = await makeRequest(lesson.id, {
                    data: {
                        courseId: newCourse.id,
                        title: updatedLesson.title,
                        text: updatedLesson.text,
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
                const course = await context.courseFactory.createOne({addedBy: author.profile, language, lessons: []});
                const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});
                const imageUploadRequest = await context.fileUploadRequestFactory.makeOne({user: author, fileField: "lessonImage"});
                const updatedLesson = context.lessonFactory.makeOne({course, image: imageUploadRequest.fileUrl});

                const response = await makeRequest(lesson.id, {
                    title: updatedLesson.title,
                    text: updatedLesson.text,
                    image: imageUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If file upload request with key was not requested by user return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: author.profile, language, lessons: []});
                const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({user: otherUser, fileField: "lessonImage"});
                const updatedLesson = context.lessonFactory.makeOne({course, image: imageUploadRequest.fileUrl});

                const response = await makeRequest(lesson.id, {
                    title: updatedLesson.title,
                    text: updatedLesson.text,
                    image: imageUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If file upload request with key is not for lessonImage field return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: author.profile, language, lessons: []});
                const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({user: otherUser, fileField: "courseImage"});
                const updatedLesson = context.lessonFactory.makeOne({course, image: imageUploadRequest.fileUrl});

                const response = await makeRequest(lesson.id, {
                    title: updatedLesson.title,
                    text: updatedLesson.text,
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
                const course = await context.courseFactory.createOne({addedBy: author.profile, language, lessons: []});
                const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});
                const audioUploadRequest = await context.fileUploadRequestFactory.makeOne({user: author, fileField: "lessonAudio"});
                const updatedLesson = context.lessonFactory.makeOne({course, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest(lesson.id, {
                    title: updatedLesson.title,
                    text: updatedLesson.text,
                    audio: audioUploadRequest.objectKey
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If file upload request with key was not requested by user return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: author.profile, language, lessons: []});
                const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({user: otherUser, fileField: "lessonAudio"});
                const updatedLesson = context.lessonFactory.makeOne({course, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest(lesson.id, {
                    title: updatedLesson.title,
                    text: updatedLesson.text,
                    audio: audioUploadRequest.objectKey
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If file upload request with key is not for lessonAudio field return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: author.profile, language, lessons: []});
                const lesson = await context.lessonFactory.createOne({course, language, addedBy: author.profile});
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({user: otherUser, fileField: "courseAudio"});
                const updatedLesson = context.lessonFactory.makeOne({course, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest(lesson.id, {
                    title: updatedLesson.title,
                    text: updatedLesson.text,
                    audio: audioUploadRequest.objectKey
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
    });
});

/**{@link LessonController#deleteLesson}*/
describe.todo("DELETE lessons/:lessonId/", function () {
    test.todo<LocalTestContext>("");
});

/**{@link LessonController#getUserLessonsHistory}*/
describe("GET users/me/lessons/history/", () => {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/me/lessons/history/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const queryDefaults = {pagination: {pageSize: 10, page: 1}};
    const defaultSortComparator = createComparator(MapPastViewerLesson, [
        {property: "lesson.title", order: "asc"},
        {property: "lesson.id", order: "asc"}]
    );
    test<LocalTestContext>("If user is logged in and there are no filters return lessons in user history", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const expectedLessons = await context.lessonFactory.create(3, {language, isPublic: true, pastViewersCount: 1});
        await context.lessonFactory.create(3, {language, isPublic: true});
        await context.lessonRepo.annotateLessonsWithUserData(expectedLessons, user);
        const expectedHistoryEntries = expectedLessons.map(lesson => context.em.create(MapPastViewerLesson, {pastViewer: user.profile, lesson}));
        await context.em.flush();
        expectedHistoryEntries.sort(defaultSortComparator);
        const recordsCount = expectedHistoryEntries.length;

        const response = await makeRequest({}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: lessonHistoryEntrySerializer.serializeList(expectedHistoryEntries)
        });
    });
    describe("test languageCode filter", () => {
        test<LocalTestContext>("If language filter is valid and language exists only return public lessons in that language", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            const expectedLessons = await context.lessonFactory.create(3, {language: language1, isPublic: true, pastViewersCount: 1});
            await context.lessonFactory.create(3, {language: language2, isPublic: true, pastViewers: [user.profile]});
            await context.lessonFactory.create(3, {language: language1, isPublic: true});
            await context.lessonRepo.annotateLessonsWithUserData(expectedLessons, user);
            const expectedHistoryEntries = expectedLessons.map(lesson => context.em.create(MapPastViewerLesson, {pastViewer: user.profile, lesson}));
            await context.em.flush();
            expectedHistoryEntries.sort(defaultSortComparator);
            const recordsCount = expectedLessons.length;

            const response = await makeRequest({languageCode: language1.code}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonHistoryEntrySerializer.serializeList(expectedHistoryEntries)
            });
        });
        test<LocalTestContext>("If language does not exist return empty lessons list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            await context.lessonFactory.create(3, {
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
        test<LocalTestContext>("If addedBy filter is valid and user exists only return public lessons added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const user1 = await context.userFactory.createOne();
            const user2 = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();

            const expectedLessons = await context.lessonFactory.create(3, {language, addedBy: user1.profile, pastViewersCount: 1});
            await context.lessonFactory.create(3, {language, addedBy: user2.profile, isPublic: true, pastViewers: [user.profile],});
            await context.lessonFactory.create(3, {language, addedBy: user1.profile, isPublic: false, pastViewers: [user.profile],});
            await context.lessonFactory.create(3, {language, addedBy: user1.profile});
            await context.lessonRepo.annotateLessonsWithUserData(expectedLessons, user);
            const expectedHistoryEntries = expectedLessons.map(lesson => context.em.create(MapPastViewerLesson, {pastViewer: user.profile, lesson}));
            await context.em.flush();
            expectedHistoryEntries.sort(defaultSortComparator);
            const recordsCount = expectedHistoryEntries.length;

            const response = await makeRequest({addedBy: user1.username}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonHistoryEntrySerializer.serializeList(expectedHistoryEntries)
            });
        });
        test<LocalTestContext>("If addedBy is me and signed in return lessons added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const otherUser = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();

            const expectedLessons = await context.lessonFactory.create(3, {language, addedBy: user.profile, pastViewersCount: 1});
            await context.lessonFactory.create(3, {language, addedBy: otherUser.profile, isPublic: true, pastViewers: [user.profile]});
            await context.lessonFactory.create(3, {language, addedBy: user.profile});
            await context.lessonRepo.annotateLessonsWithUserData(expectedLessons, user);
            const expectedHistoryEntries = expectedLessons.map(lesson => context.em.create(MapPastViewerLesson, {pastViewer: user.profile, lesson}));
            await context.em.flush();
            expectedHistoryEntries.sort(defaultSortComparator);
            const recordsCount = expectedHistoryEntries.length;

            const response = await makeRequest({addedBy: "me"}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonHistoryEntrySerializer.serializeList(expectedHistoryEntries)
            });
        });
        test<LocalTestContext>("If user does not exist return empty lesson list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            await context.lessonFactory.create(3, {
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
        test<LocalTestContext>("If searchQuery is valid return lessons with query in title", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const searchQuery = "search query";
            const expectedLessons = await Promise.all(Array.from({length: 3}).map(async () =>
                context.lessonFactory.createOne({language, isPublic: true, pastViewersCount: 1, title: `${randomCase(searchQuery)}-${faker.random.alpha(10)}`})
            ));
            await context.lessonRepo.annotateLessonsWithUserData(expectedLessons, user);
            const expectedHistoryEntries = expectedLessons.map(lesson => context.em.create(MapPastViewerLesson, {pastViewer: user.profile, lesson}));
            await context.em.flush();
            expectedHistoryEntries.sort(defaultSortComparator);
            await context.lessonFactory.create(3, {language, isPublic: true, pastViewers: [user.profile],});
            await context.lessonFactory.create(3, {language, isPublic: true});
            const recordsCount = expectedHistoryEntries.length;

            const response = await makeRequest({searchQuery: searchQuery}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonHistoryEntrySerializer.serializeList(expectedHistoryEntries)
            });
        });
        test<LocalTestContext>("If searchQuery is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})}, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If no lessons match search query return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            await context.lessonFactory.create(3, {language: language, isPublic: true, pastViewers: [user.profile]});
            await context.lessonFactory.create(3, {language: language, isPublic: true});

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
        test<LocalTestContext>("If hasAudio is true return lessons with audio", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const audio = faker.internet.url();
            const expectedLessons = await context.lessonFactory.create(3, {language, isPublic: true, pastViewersCount: 1, audio});
            await context.lessonFactory.create(3, {language, isPublic: true, pastViewers: [user.profile], audio: ""});
            await context.lessonFactory.create(3, {language, isPublic: true, audio});
            await context.lessonRepo.annotateLessonsWithUserData(expectedLessons, user);
            const expectedHistoryEntries = expectedLessons.map(lesson => context.em.create(MapPastViewerLesson, {pastViewer: user.profile, lesson}));
            await context.em.flush();
            expectedHistoryEntries.sort(defaultSortComparator);
            const recordsCount = expectedHistoryEntries.length;

            const response = await makeRequest({hasAudio: true}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonHistoryEntrySerializer.serializeList(expectedHistoryEntries)
            });
        });
        test<LocalTestContext>("If hasAudio is false return lessons with no audio", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const audio = faker.internet.url();
            await context.lessonFactory.create(3, {language, isPublic: true, pastViewers: [user.profile], audio});
            const expectedLessons = await context.lessonFactory.create(3, {language, isPublic: true, pastViewersCount: 1, audio: ""});
            await context.lessonFactory.create(3, {language, isPublic: true, audio});
            await context.lessonRepo.annotateLessonsWithUserData(expectedLessons, user);
            const expectedHistoryEntries = expectedLessons.map(lesson => context.em.create(MapPastViewerLesson, {pastViewer: user.profile, lesson}));
            await context.em.flush();
            expectedHistoryEntries.sort(defaultSortComparator);
            const recordsCount = expectedHistoryEntries.length;

            const response = await makeRequest({hasAudio: false}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonHistoryEntrySerializer.serializeList(expectedHistoryEntries)
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
                const expectedLessons = [
                    await context.lessonFactory.createOne({language, isPublic: true, pastViewersCount: 1, title: "abc"}),
                    await context.lessonFactory.createOne({language, isPublic: true, pastViewersCount: 1, title: "def"})
                ];
                await context.lessonRepo.annotateLessonsWithUserData(expectedLessons, user);
                const expectedHistoryEntries = expectedLessons.map(lesson => context.em.create(MapPastViewerLesson, {pastViewer: user.profile, lesson}));
                await context.em.flush();
                const recordsCount = expectedHistoryEntries.length;

                const response = await makeRequest({sortBy: "title"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: lessonHistoryEntrySerializer.serializeList(expectedHistoryEntries)
                });
            });
            test<LocalTestContext>("test sortBy createdDate", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();

                const expectedLessons = [
                    await context.lessonFactory.createOne({
                        language, isPublic: true, pastViewersCount: 1,
                        addedOn: new Date("2018-07-22T10:30:45.000Z")
                    }),
                    await context.lessonFactory.createOne({
                        language, isPublic: true, pastViewersCount: 1,
                        addedOn: new Date("2023-03-15T20:29:42.000Z")
                    }),
                ];
                await context.lessonRepo.annotateLessonsWithUserData(expectedLessons, user);
                const expectedHistoryEntries = expectedLessons.map(lesson => context.em.create(MapPastViewerLesson, {pastViewer: user.profile, lesson}));
                await context.em.flush();
                const recordsCount = expectedHistoryEntries.length;

                const response = await makeRequest({sortBy: "createdDate"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: lessonHistoryEntrySerializer.serializeList(expectedHistoryEntries)
                });
            });
            test<LocalTestContext>("test sortBy pastViewersCount", async (context) => {
                const user = await context.userFactory.createOne();
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedLessons = [
                    await context.lessonFactory.createOne({language, isPublic: true, pastViewersCount: 1, pastViewers: []}),
                    await context.lessonFactory.createOne({language, isPublic: true, pastViewersCount: 2, pastViewers: [user1.profile]}),
                    await context.lessonFactory.createOne({language, isPublic: true, pastViewersCount: 3, pastViewers: [user1.profile, user2.profile]})
                ];
                await context.lessonRepo.annotateLessonsWithUserData(expectedLessons, user);
                const expectedHistoryEntries = expectedLessons.map(lesson => context.em.create(MapPastViewerLesson, {pastViewer: user.profile, lesson}));
                await context.em.flush();
                const recordsCount = expectedHistoryEntries.length;

                const response = await makeRequest({sortBy: "pastViewersCount"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: lessonHistoryEntrySerializer.serializeList(expectedHistoryEntries)
                });
            });
            test<LocalTestContext>("test sortBy timeViewed", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();

                const expectedHistoryEntries = [
                    context.em.create(MapPastViewerLesson, {
                        lesson: await context.lessonFactory.createOne({language, isPublic: true, pastViewersCount: 1}), pastViewer: user.profile,
                        timeViewed: new Date("2018-07-22T10:30:45.000Z")
                    }),
                    context.em.create(MapPastViewerLesson, {
                        lesson: await context.lessonFactory.createOne({language, isPublic: true, pastViewersCount: 1}), pastViewer: user.profile,
                        timeViewed: new Date("2023-03-15T20:29:42.000Z")
                    })
                ];
                await context.em.flush();
                await context.lessonRepo.annotateLessonsWithUserData(expectedHistoryEntries.map(e => e.lesson), user);
                const recordsCount = expectedHistoryEntries.length;

                const response = await makeRequest({sortBy: "timeViewed"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: lessonHistoryEntrySerializer.serializeList(expectedHistoryEntries)
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
            test<LocalTestContext>("If sortOrder is asc return the lessons in ascending order", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedLessons = [
                    await context.lessonFactory.createOne({language, isPublic: true, pastViewersCount: 1, title: "abc"}),
                    await context.lessonFactory.createOne({language, isPublic: true, pastViewersCount: 1, title: "def"})
                ];
                await context.lessonRepo.annotateLessonsWithUserData(expectedLessons, user);
                const expectedHistoryEntries = expectedLessons.map(lesson => context.em.create(MapPastViewerLesson, {pastViewer: user.profile, lesson}));
                await context.em.flush();
                const recordsCount = expectedHistoryEntries.length;

                const response = await makeRequest({sortOrder: "asc"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: lessonHistoryEntrySerializer.serializeList(expectedHistoryEntries)
                });
            });
            test<LocalTestContext>("If sortOrder is desc return the lessons in descending order", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedLessons = [
                    await context.lessonFactory.createOne({language, isPublic: true, pastViewersCount: 1, title: "def"}),
                    await context.lessonFactory.createOne({language, isPublic: true, pastViewersCount: 1, title: "abc"})
                ];
                await context.lessonRepo.annotateLessonsWithUserData(expectedLessons, user);
                const expectedHistoryEntries = expectedLessons.map(lesson => context.em.create(MapPastViewerLesson, {pastViewer: user.profile, lesson}));
                await context.em.flush();
                const recordsCount = expectedHistoryEntries.length;

                const response = await makeRequest({sortOrder: "desc"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: lessonHistoryEntrySerializer.serializeList(expectedHistoryEntries)
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
                const allLessons = await context.lessonFactory.create(10, {language, isPublic: true, pastViewersCount: 1});
                await context.lessonFactory.create(3, {language, isPublic: true});
                await context.lessonRepo.annotateLessonsWithUserData(allLessons, user);
                const allHistoryEntries = allLessons.map(lesson => context.em.create(MapPastViewerLesson, {pastViewer: user.profile, lesson}));
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
                    data: lessonHistoryEntrySerializer.serializeList(expectedHistoryEntries)
                });
            });
            test<LocalTestContext>("If page is 2 return the second page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const allLessons = await context.lessonFactory.create(10, {language, isPublic: true, pastViewersCount: 1});
                await context.lessonFactory.create(3, {language, isPublic: true});
                await context.lessonRepo.annotateLessonsWithUserData(allLessons, user);
                const allHistoryEntries = allLessons.map(lesson => context.em.create(MapPastViewerLesson, {pastViewer: user.profile, lesson}));
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
                    data: lessonHistoryEntrySerializer.serializeList(expectedHistoryEntries)
                });
            });
            test<LocalTestContext>("If page is last return the last page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const allLessons = await context.lessonFactory.create(10, {language, isPublic: true, pastViewersCount: 1});
                await context.lessonFactory.create(3, {language, isPublic: true});
                await context.lessonRepo.annotateLessonsWithUserData(allLessons, user);
                const allHistoryEntries = allLessons.map(lesson => context.em.create(MapPastViewerLesson, {pastViewer: user.profile, lesson}));
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
                    data: lessonHistoryEntrySerializer.serializeList(expectedHistoryEntries)
                });
            });
            test<LocalTestContext>("If page is more than last return empty page", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const allLessons = await context.lessonFactory.create(10, {language, isPublic: true, pastViewers: [user.profile]});
                await context.lessonFactory.create(3, {language, isPublic: true});
                const allHistoryEntries = allLessons.map(lesson => context.em.create(MapPastViewerLesson, {pastViewer: user.profile, lesson}));
                allHistoryEntries.sort(defaultSortComparator);

                const recordsCount = allLessons.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize) + 1;
                const expectedLessons = allLessons.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.lessonRepo.annotateLessonsWithUserData(expectedLessons, user);

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
                const allLessons = await context.lessonFactory.create(50, {language, isPublic: true, pastViewersCount: 1});
                await context.lessonFactory.create(3, {language, isPublic: true});
                await context.lessonRepo.annotateLessonsWithUserData(allLessons, user);
                const allHistoryEntries = allLessons.map(lesson => context.em.create(MapPastViewerLesson, {pastViewer: user.profile, lesson}));
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
                    data: lessonHistoryEntrySerializer.serializeList(expectedHistoryEntries)
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

/**{@link LessonController#addLessonToUserHistory}*/
describe("POST users/me/lessons/history/", () => {
    const makeRequest = async (body: object, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `users/me/lessons/history/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };
    test<LocalTestContext>("If the lesson exists and is public and user is learning lesson language add lesson to user's lesson history", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const expectedLesson = await context.lessonFactory.createOne({language, isPublic: true});
        await context.lessonRepo.annotateLessonsWithUserData([expectedLesson], user);

        const response = await makeRequest({lessonId: expectedLesson.id}, session.token);

        expectedLesson.pastViewersCount++;
        expect(response.statusCode).to.equal(201);
        expect(response.json()).toEqual(lessonSerializer.serialize(expectedLesson));
        const dbRecord = await context.em.findOne(MapPastViewerLesson, {
            pastViewer: user.profile, lesson: expectedLesson
        }, {populate: ["lesson"]});
        expect(dbRecord).not.toBeNull();
        expect(lessonSerializer.serialize(dbRecord!.lesson)).toEqual(lessonSerializer.serialize(expectedLesson));
    });
    test<LocalTestContext>("If lesson is already in user history add it again with newer timestamp", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const expectedLesson = await context.lessonFactory.createOne({language, isPublic: true, pastViewers: user.profile});
        await context.lessonRepo.annotateLessonsWithUserData([expectedLesson], user);

        const response = await makeRequest({lessonId: expectedLesson.id}, session.token);

        expect(response.statusCode).to.equal(201);
        expect(response.json()).toEqual(lessonSerializer.serialize(expectedLesson));
        const dbRecords = await context.em.find(MapPastViewerLesson, {
            pastViewer: user.profile, lesson: expectedLesson
        }, {populate: ["lesson"], orderBy: {timeViewed: "desc"}});
        expect(dbRecords).toHaveLength(2);
        expect(lessonSerializer.serialize(dbRecords[0].lesson)).toEqual(lessonSerializer.serialize(expectedLesson));
    });
    describe("If required fields are missing return 400", function () {
        test<LocalTestContext>("If the lessonId is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const response = await makeRequest({}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 400", function () {
        describe("If the lesson is invalid return 400", async () => {
            test<LocalTestContext>("If the lessonId is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest({lessonId: faker.random.alpha(10)}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If the lesson is not found return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest({lessonId: faker.datatype.number({min: 100000})}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If the lesson is not public and the user is logged in as author return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const author = await context.userFactory.createOne();
                const language = await context.languageFactory.createOne({learners: user.profile});
                const lesson = await context.lessonFactory.createOne({language, isPublic: false, addedBy: author.profile});

                const response = await makeRequest({lessonId: lesson.id}, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If the lesson is not in a language the user is learning return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const lesson = await context.lessonFactory.createOne({language, isPublic: true});

                const response = await makeRequest({lessonId: lesson.id}, session.token);

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
        const lesson = await context.lessonFactory.createOne({language, isPublic: true});

        const response = await makeRequest({lessonId: lesson.id}, session.token);
        expect(response.statusCode).to.equal(403);
    });
});

/**{@link LessonController#getNextLessonInCourse}*/
describe("GET courses/:courseId/lessons/:lessonId/next/", () => {
    const makeRequest = async (courseId: string | number, lessonId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `courses/${courseId}/lessons/${lessonId}/next/`,
        };
        return await fetchRequest(options, authToken);
    };

    describe("If the course and lesson exist and lesson is not last return redirect to next lesson in course", async () => {
        test<LocalTestContext>("If lesson is public return redirect to next lesson in course", async (context) => {
            const author = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({
                language,
                addedBy: author.profile,
                lessons: context.lessonFactory.makeDefinitions(5, {language, addedBy: author.profile, isPublic: true})
            });
            const previousLesson = course.lessons[0];
            const expectedLesson = course.lessons[1];

            const response = await makeRequest(course.id, previousLesson.id);

            expect(response.statusCode).to.equal(303);
            expect(response.headers.location).toEqual(`${API_ROOT}/lessons/${expectedLesson.id}/`);
        });
        test<LocalTestContext>("If lesson is not public and user is not author skip lesson and redirect to next next lesson in course", async (context) => {
            const language = await context.languageFactory.createOne();
            const author = await context.userFactory.createOne();
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const course = await context.courseFactory.createOne({
                language, addedBy: author.profile,
                lessons: [
                    context.lessonFactory.makeDefinition({language, isPublic: true, addedBy: author.profile}),
                    context.lessonFactory.makeDefinition({language, isPublic: false, addedBy: author.profile}),
                    context.lessonFactory.makeDefinition({language, isPublic: true, addedBy: author.profile}),
                    context.lessonFactory.makeDefinition({language, isPublic: true, addedBy: author.profile})
                ]
            });
            const previousLesson = course.lessons[0];
            const expectedLesson = course.lessons[2];

            const response = await makeRequest(course.id, previousLesson.id, session.token);

            expect(response.statusCode).to.equal(303);
            expect(response.headers.location).toEqual(`${API_ROOT}/lessons/${expectedLesson.id}/`);
        });
        test<LocalTestContext>("If lesson is not public and user is author return redirect to next lesson in course", async (context) => {
            const language = await context.languageFactory.createOne();
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const course = await context.courseFactory.createOne({
                language,
                addedBy: author.profile,
                lessons: context.lessonFactory.makeDefinitions(5, {addedBy: author.profile, language, isPublic: false})
            });
            const previousLesson = course.lessons[0];
            const expectedLesson = course.lessons[1];

            const response = await makeRequest(course.id, previousLesson.id, session.token);

            expect(response.statusCode).to.equal(303);
            expect(response.headers.location).toEqual(`${API_ROOT}/lessons/${expectedLesson.id}/`);
        });
    });
    test<LocalTestContext>("If the course does not exist return 404", async (context) => {
        const language = await context.languageFactory.createOne();
        const lesson = await context.lessonFactory.createOne({course: await context.courseFactory.createOne({language}), language, isPublic: true});
        const response = await makeRequest(Number(faker.random.numeric(8)), lesson.id);
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If the lesson does not exist return 404", async (context) => {
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({language, lessons: context.lessonFactory.makeDefinitions(5, {language, isPublic: true})});
        const response = await makeRequest(course.id, Number(faker.random.numeric(8)));

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If the lesson is last in course return 404", async (context) => {
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({language, lessons: context.lessonFactory.makeDefinitions(5, {language, isPublic: true})});
        const previousLesson = course.lessons[course.lessons.length - 1];

        const response = await makeRequest(course.id, previousLesson.id);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If the lesson is last public one in course and user is not author return 404", async (context) => {
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({
            language,
            lessons: [
                ...context.lessonFactory.makeDefinitions(5, {language, isPublic: true}),
                context.lessonFactory.makeDefinition({language, isPublic: false})
            ]
        });
        const previousLesson = course.lessons[course.lessons.length - 2];

        const response = await makeRequest(course.id, previousLesson.id);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If course id is invalid return 400", async (context) => {
        const language = await context.languageFactory.createOne();
        const lesson = await context.lessonFactory.createOne({course: await context.courseFactory.createOne({language}), language, isPublic: true});

        const response = await makeRequest(faker.random.alpha(8), lesson.id);
        expect(response.statusCode).to.equal(400);
    });
    test<LocalTestContext>("If lesson id is invalid return 400", async (context) => {
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({language, lessons: context.lessonFactory.makeDefinitions(5, {language, isPublic: true})});

        const response = await makeRequest(course.id, faker.random.alpha(8));
        expect(response.statusCode).to.equal(400);
    });
});
