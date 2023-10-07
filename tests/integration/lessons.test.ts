import {beforeEach, describe, expect, test, TestContext, vi} from "vitest";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";
import {CourseRepo} from "@/src/models/repos/CourseRepo.js";
import {LessonRepo} from "@/src/models/repos/LessonRepo.js";
import {LanguageFactory} from "@/src/seeders/factories/LanguageFactory.js";
import {CourseFactory} from "@/src/seeders/factories/CourseFactory.js";
import {LessonFactory} from "@/src/seeders/factories/LessonFactory.js";
import {orm} from "@/src/server.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {Course} from "@/src/models/entities/Course.js";
import {InjectOptions} from "light-my-request";
import {buildQueryString, createComparator, fetchRequest, fetchWithFiles, mockValidateFileFields, readSampleFile} from "@/tests/integration/utils.js";
import {lessonSerializer} from "@/src/presentation/response/serializers/entities/LessonSerializer.js";
import {faker} from "@faker-js/faker";
import {randomCase, randomEnum, randomEnums} from "@/tests/utils.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {EntityRepository} from "@mikro-orm/core";
import * as parserExports from "@/src/utils/parsers/parsers.js";
import {getParser, parsers} from "@/src/utils/parsers/parsers.js";
import {MapLessonVocab} from "@/src/models/entities/MapLessonVocab.js";
import fs from "fs-extra";
import {MapPastViewerLesson} from "@/src/models/entities/MapPastViewerLesson.js";
import * as fileValidatorExports from "@/src/validators/fileValidator.js";
import * as constantExports from "@/src/constants.js";
import {TEMP_ROOT_FILE_UPLOAD_DIR} from "@/tests/testConstants.js";
import {escapeRegExp} from "@/src/utils/utils.js";

interface LocalTestContext extends TestContext {
    languageFactory: LanguageFactory;
    lessonFactory: LessonFactory;
    courseFactory: CourseFactory;
    courseRepo: CourseRepo;
    lessonRepo: LessonRepo;
    vocabRepo: EntityRepository<Vocab>;
}

beforeEach<LocalTestContext>(async (context) => {
    await orm.getSchemaGenerator().clearDatabase();
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.profileFactory = new ProfileFactory(context.em);
    context.sessionFactory = new SessionFactory(context.em);
    context.lessonFactory = new LessonFactory(context.em);
    context.courseFactory = new CourseFactory(context.em);
    context.languageFactory = new LanguageFactory(context.em);

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
            course: await context.courseFactory.createOne({
                language: language,
                isPublic: true
            })
        });
        await context.lessonFactory.create(3, {course: await context.courseFactory.createOne({language: language, isPublic: false})});
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
                course: await context.courseFactory.createOne({language: language1, isPublic: true})
            });
            await context.lessonFactory.create(3, {course: await context.courseFactory.createOne({language: language1, isPublic: false})});
            await context.lessonFactory.create(3, {course: await context.courseFactory.createOne({language: language2, isPublic: true})});
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
            await context.lessonFactory.create(3, {course: await context.courseFactory.createOne({language: await context.languageFactory.createOne()})});

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
    describe("test addedBy filter", () => {
        test<LocalTestContext>("If addedBy filter is valid and user exists only return public lessons added by that user", async (context) => {
            const user1 = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const expectedLessons = await context.lessonFactory.create(3, {
                course: await context.courseFactory.createOne({
                    language: language,
                    addedBy: user1.profile
                })
            });
            await context.lessonFactory.create(3, {course: await context.courseFactory.createOne({language: language})});
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
                course: await context.courseFactory.createOne({
                    language: language,
                    addedBy: user.profile
                })
            });
            await context.lessonFactory.create(3, {course: await context.courseFactory.createOne({language: language})});
            await context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.profile.id);
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
            const course = await context.courseFactory.createOne({language});
            const searchQuery = "search query";
            const expectedLessons = [
                await context.lessonFactory.createOne({course, title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`}),
                await context.lessonFactory.createOne({course, title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`}),
                await context.lessonFactory.createOne({course, title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`})
            ];
            await context.lessonFactory.create(3, {course});
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
            await context.lessonFactory.create(3, {course: await context.courseFactory.createOne({language: await context.languageFactory.createOne()})});

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
    describe("test level filter", () => {
        test<LocalTestContext>("If the level is valid return lessons in that level", async (context) => {
            const level = randomEnum(LanguageLevel);
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({isPublic: true, language: language});
            const expectedLessons = await context.lessonFactory.create(3, {level, course});
            await context.lessonFactory.create(3, {course, level: randomEnum(LanguageLevel, [level])});
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
            const course = await context.courseFactory.createOne({isPublic: true, language: language});
            const expectedLessons = (await Promise.all(levels.map(level => context.lessonFactory.create(3, {level, course})))).flat();
            await context.lessonFactory.create(3, {course, level: randomEnum(LanguageLevel, levels)});
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
    describe("test hasAudio filter", () => {
        test<LocalTestContext>("If hasAudio is true return lessons with audio", async (context) => {
            const language = await context.languageFactory.createOne();
            const expectedLessons = await context.lessonFactory.create(3, {
                course: await context.courseFactory.createOne({language, isPublic: true}),
                audio: "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg"
            });
            await context.lessonFactory.create(3, {
                course: await context.courseFactory.createOne({language: language, isPublic: true}),
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
                course: await context.courseFactory.createOne({language: language, isPublic: true}),
                audio: ""
            });
            await context.lessonFactory.create(3, {
                course: await context.courseFactory.createOne({language, isPublic: true}),
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
                const course = await context.courseFactory.createOne({language});
                const expectedLessons = [
                    await context.lessonFactory.createOne({course, title: "abc"}),
                    await context.lessonFactory.createOne({course, title: "def"})
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
                const course = await context.courseFactory.createOne({language});
                const expectedLessons = [
                    await context.lessonFactory.createOne({course, addedOn: new Date("2018-07-22T10:30:45.000Z")}),
                    await context.lessonFactory.createOne({course, addedOn: new Date("2023-03-15T20:29:42.000Z")})
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
                const course = await context.courseFactory.createOne({language});
                const expectedLessons = [
                    await context.lessonFactory.createOne({course, pastViewers: []}),
                    await context.lessonFactory.createOne({course, pastViewers: [user1.profile]}),
                    await context.lessonFactory.createOne({course, pastViewers: [user1.profile, user2.profile]}),
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
                const course = await context.courseFactory.createOne({language});
                const expectedLessons = [
                    await context.lessonFactory.createOne({course, title: "abc"}),
                    await context.lessonFactory.createOne({course, title: "def"})
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
                const course = await context.courseFactory.createOne({language});
                const expectedLessons = [
                    await context.lessonFactory.createOne({course, title: "def"}),
                    await context.lessonFactory.createOne({course, title: "abc"}),
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
                    course: await context.courseFactory.createOne({
                        language,
                        isPublic: true
                    })
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
                    course: await context.courseFactory.createOne({
                        language,
                        isPublic: true
                    })
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
                    course: await context.courseFactory.createOne({
                        language,
                        isPublic: true
                    })
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
                    course: await context.courseFactory.createOne({
                        language,
                        isPublic: true
                    })
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
                    course: await context.courseFactory.createOne({
                        language,
                        isPublic: true
                    })
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
            course: await context.courseFactory.createOne({
                language: language,
                isPublic: true
            })
        });
        context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.profile.id);
        await context.lessonFactory.create(3, {course: await context.courseFactory.createOne({language: language, isPublic: false})});
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
            ...await context.lessonFactory.create(3, {course: await context.courseFactory.createOne({language, isPublic: true})}),
            ...await context.lessonFactory.create(3, {
                course: await context.courseFactory.createOne({
                    language,
                    isPublic: false,
                    addedBy: user.profile
                })
            }),
        ];
        context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.profile.id);
        await context.lessonFactory.create(3, {course: await context.courseFactory.createOne({language: language, isPublic: false})});
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
    const makeRequest = async ({data, files = {}}: {
        data: object; files?: { [key: string]: { value: ""; } | { value: Buffer; fileName?: string, mimeType?: string } };
    }, authToken?: string) => {
        return await fetchWithFiles({
            options: {
                method: "POST",
                url: "lessons/",
                body: {
                    data: data,
                    files: files
                },
            },
            authToken: authToken
        });
    };
    const imagePathRegex = new RegExp(`^${escapeRegExp(`${TEMP_ROOT_FILE_UPLOAD_DIR}/lessons/images/`)}.*-.*\.(png|jpg|jpeg)$`);
    const audioPathRegex = new RegExp(`^${escapeRegExp(`${TEMP_ROOT_FILE_UPLOAD_DIR}/lessons/audios/`)}.*-.*\.(mp3|wav)$`);

    describe("If all fields are valid a new lesson should be created and return 201", () => {
        test<LocalTestContext>("If optional fields are missing use default values", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            vi.spyOn(parserExports, "getParser").mockImplementation((_) => parserExports.parsers["en"]);
            const course = await context.courseFactory.createOne({language: language, addedBy: user.profile, lessons: []});
            const newLesson = context.lessonFactory.makeOne({course, image: "", audio: ""});

            const response = await makeRequest({
                data: {
                    title: newLesson.title,
                    text: newLesson.text,
                    courseId: course.id,
                }
            }, session.token);

            expect(response.statusCode).to.equal(201);
            const dbRecord = await context.lessonRepo.findOne({course: course}, {populate: ["course", "course.language", "course.addedBy.user"]});
            expect(dbRecord).not.toBeNull();
            if (!dbRecord) return;
            await context.lessonRepo.annotateVocabsByLevel([dbRecord], user.id);
            await context.courseRepo.annotateVocabsByLevel([dbRecord.course], user.id);
            expect(response.json()).toMatchObject(lessonSerializer.serialize(newLesson, {ignore: ["addedOn"]}));
            expect(lessonSerializer.serialize(dbRecord)).toMatchObject(lessonSerializer.serialize(newLesson, {ignore: ["addedOn"]}));

            const [_, lessonWordsText] = parsers["en"].parseText(`${newLesson.title} ${newLesson.text}`);
            const lessonVocabs = await context.vocabRepo.find({text: lessonWordsText, language: course.language});
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
            const newLesson = context.lessonFactory.makeOne({course: course});
            vi.spyOn(parserExports, "getParser").mockImplementation((_) => parserExports.parsers["en"]);

            const response = await makeRequest({
                data: {
                    title: newLesson.title,
                    text: newLesson.text,
                    courseId: course.id,
                }, files: {
                    image: readSampleFile("images/lorem-ipsum-69_8KB-1_1ratio.png"),
                    audio: readSampleFile("audio/piano-97_9KB.wav"),
                }
            }, session.token);

            expect(response.statusCode).to.equal(201);
            const dbRecord = await context.lessonRepo.findOne({course: course}, {populate: ["course", "course.language", "course.addedBy.user"]});
            expect(dbRecord).not.toBeNull();
            if (!dbRecord) return;
            await context.lessonRepo.annotateVocabsByLevel([dbRecord], user.id);
            await context.courseRepo.annotateVocabsByLevel([dbRecord.course], user.id);
            expect(response.json()).toMatchObject(lessonSerializer.serialize(newLesson, {ignore: ["addedOn", "image", "audio"]}));
            expect(lessonSerializer.serialize(dbRecord)).toMatchObject(lessonSerializer.serialize(newLesson, {ignore: ["addedOn", "image", "audio"]}));
            expect(dbRecord.image).toEqual(expect.stringMatching(imagePathRegex));
            expect(dbRecord.audio).toEqual(expect.stringMatching(audioPathRegex));

            const [_, lessonWordsText] = parsers["en"].parseText(`${newLesson.title} ${newLesson.text}`);
            const lessonVocabs = await context.vocabRepo.find({text: lessonWordsText, language: course.language});
            const lessonVocabMappings = await context.em.find(MapLessonVocab, {vocab: lessonVocabs, lesson: dbRecord});

            expect(lessonVocabs.length).toEqual(lessonWordsText.length);
            expect(lessonVocabs.map(v => v.text)).toEqual(expect.arrayContaining(lessonWordsText));
            expect(lessonVocabMappings.length).toEqual(lessonWordsText.length);
        });
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const course = await context.courseFactory.createOne({language: await context.languageFactory.createOne()});
        const newLesson = context.lessonFactory.makeOne({course: course});

        const response = await makeRequest({
            data: {
                title: newLesson.title,
                text: newLesson.text,
                courseId: course.id,
            }
        });

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const course = await context.courseFactory.createOne({language: await context.languageFactory.createOne()});
        const newLesson = context.lessonFactory.makeOne({course: course});

        const response = await makeRequest({
            data: {
                title: newLesson.title,
                text: newLesson.text,
                courseId: course.id,
            }
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
    describe("If required fields are missing return 400", async () => {
        test<LocalTestContext>("If title is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({language, addedBy: user.profile, lessons: []});
            let newLesson: Lesson | null = context.lessonFactory.makeOne({course: course});

            const response = await makeRequest({
                data: {
                    text: newLesson.text,
                    courseId: course.id,
                }
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If text is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({language, addedBy: user.profile, lessons: []});
            let newLesson: Lesson | null = context.lessonFactory.makeOne({course: course});

            const response = await makeRequest({
                data: {
                    title: newLesson.title,
                    courseId: course.id,
                }
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If course is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({language, addedBy: user.profile, lessons: []});
            let newLesson: Lesson | null = context.lessonFactory.makeOne({course: course});

            const response = await makeRequest({
                data: {
                    title: newLesson.title,
                    text: newLesson.text,
                }
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 4xx code", async () => {
        test<LocalTestContext>("If title is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({language, addedBy: user.profile, lessons: []});
            let newLesson: Lesson | null = context.lessonFactory.makeOne({course: course});

            const response = await makeRequest({
                data: {
                    title: faker.random.alphaNumeric(200),
                    text: newLesson.text,
                    courseId: course.id,
                }
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If text is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({language, addedBy: user.profile, lessons: []});
            let newLesson: Lesson | null = context.lessonFactory.makeOne({course: course});

            const response = await makeRequest({
                data: {
                    title: newLesson.text,
                    text: faker.random.words(40000),
                    courseId: course.id,
                }
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        describe("If course is invalid return 400", async () => {
            test<LocalTestContext>("If course id is not a number return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language, addedBy: user.profile, lessons: []});
                let newLesson: Lesson | null = context.lessonFactory.makeOne({course: course});

                const response = await makeRequest({
                    data: {
                        title: newLesson.title,
                        text: newLesson.text,
                        courseId: faker.random.alpha(3),
                    }
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If course does not exist return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language, addedBy: user.profile, lessons: []});
                let newLesson: Lesson | null = context.lessonFactory.makeOne({course: course});

                const response = await makeRequest({
                    data: {
                        title: newLesson.title,
                        text: newLesson.text,
                        courseId: faker.datatype.number({min: 10000}),
                    }
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If user is not author of course and course is not public return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language, addedBy: otherUser.profile, lessons: [], isPublic: false});
                let newLesson: Lesson | null = context.lessonFactory.makeOne({course: course});

                const response = await makeRequest({
                    data: {
                        title: newLesson.title,
                        text: newLesson.text,
                        courseId: course.id,
                    }
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If user is not author of course and course is public return 403", async (context) => {
                const user = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language, addedBy: otherUser.profile, lessons: [], isPublic: true});
                let newLesson: Lesson | null = context.lessonFactory.makeOne({course: course});

                const response = await makeRequest({
                    data: {
                        title: newLesson.title,
                        text: newLesson.text,
                        courseId: course.id,
                    }
                }, session.token);

                expect(response.statusCode).to.equal(403);
            });
        });
        describe("If image is invalid return 4xx", async () => {
            test<LocalTestContext>("If image is not a jpeg or png return 415", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language, addedBy: user.profile, lessons: []});
                let newLesson: Lesson | null = context.lessonFactory.makeOne({course: course});

                const response = await makeRequest({
                    data: {
                        title: newLesson.title,
                        text: newLesson.text,
                        courseId: course.id,
                    },
                    files: {image: readSampleFile("images/audio-468_4KB.png")}
                }, session.token);

                expect(response.statusCode).to.equal(415);
            });
            // test<LocalTestContext>("If image is corrupted return 415", async (context) => {});
            test<LocalTestContext>("If the image file is more than 500KB return 413", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language, addedBy: user.profile, lessons: []});
                let newLesson: Lesson | null = context.lessonFactory.makeOne({course: course});
                vi.spyOn(fileValidatorExports, "validateFileFields").mockImplementation(mockValidateFileFields({"image": 510 * 1024}));

                const response = await makeRequest({
                    data: {
                        title: newLesson.title,
                        text: newLesson.text,
                        courseId: course.id,
                    },
                    files: {image: readSampleFile("images/lorem-ipsum-69_8KB-1_1ratio.png")}
                }, session.token);

                expect(response.statusCode).to.equal(413);
            });
            test<LocalTestContext>("If the image is not square return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language, addedBy: user.profile, lessons: []});
                let newLesson: Lesson | null = context.lessonFactory.makeOne({course: course});

                const response = await makeRequest({
                    data: {
                        title: newLesson.title,
                        text: newLesson.text,
                        courseId: course.id,
                    },
                    files: {image: readSampleFile("images/rectangle-5_2KB-2_1ratio.png")}
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
        describe("If audio is invalid return 4xx", async () => {
            test<LocalTestContext>("If audio is not a mpeg or wav or ogg return 415", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language, addedBy: user.profile, lessons: []});
                let newLesson: Lesson | null = context.lessonFactory.makeOne({course: course});

                const response = await makeRequest({
                    data: {
                        title: newLesson.title,
                        text: newLesson.text,
                        courseId: course.id,
                    },
                    files: {audio: readSampleFile("audio/image-69_8KB.wav")}
                }, session.token);

                expect(response.statusCode).to.equal(415);
            });
            // test<LocalTestContext>("If audio is corrupted return 415", async (context) => {});
            test<LocalTestContext>("If the audio file is more than 100MB return 413", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language, addedBy: user.profile, lessons: []});
                let newLesson: Lesson | null = context.lessonFactory.makeOne({course: course});
                vi.spyOn(fileValidatorExports, "validateFileFields").mockImplementation(mockValidateFileFields({"audio": 110 * 1024 * 1024}));

                const response = await makeRequest({
                    data: {
                        title: newLesson.title,
                        text: newLesson.text,
                        courseId: course.id,
                    },
                    files: {
                        audio: readSampleFile("audio/piano-97_9KB.wav")
                    }
                }, session.token);

                expect(response.statusCode).to.equal(413);
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
        test<LocalTestContext>("If the user is not logged in return lesson and course without vocab levels", async (context) => {
            const language = await context.languageFactory.createOne();
            const expectedLesson = await context.lessonFactory.createOne({
                course: await context.courseFactory.createOne({
                    language,
                    isPublic: true
                })
            });

            const response = await makeRequest(expectedLesson.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serialize(expectedLesson));
        });
        test<LocalTestContext>("If the user is logged in return lesson and course with vocab levels", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const expectedLesson = await context.lessonFactory.createOne({
                course: await context.courseFactory.createOne({
                    language,
                    isPublic: true
                })
            });
            await context.lessonRepo.annotateVocabsByLevel([expectedLesson], user.id);
            await context.courseRepo.annotateVocabsByLevel([expectedLesson.course], user.id);

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
        const lesson = await context.lessonFactory.createOne({course: await context.courseFactory.createOne({language, isPublic: false})});

        const response = await makeRequest(lesson.id);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If the lesson is not public and the user is logged in as a non-author return 404", async (context) => {
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const lesson = await context.lessonFactory.createOne({
            course: await context.courseFactory.createOne({language, isPublic: false, addedBy: author.profile})
        });
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: otherUser});

        const response = await makeRequest(lesson.id, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If the lesson is not public and the user is logged in as author return lesson with vocabs by level", async (context) => {
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const lesson = await context.lessonFactory.createOne({
            course: await context.courseFactory.createOne({language, isPublic: false, addedBy: author.profile})
        });
        const session = await context.sessionFactory.createOne({user: author});

        const response = await makeRequest(lesson.id, session.token);

        await context.lessonRepo.annotateVocabsByLevel([lesson], author.id);
        await context.courseRepo.annotateVocabsByLevel([lesson.course], author.id);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(lessonSerializer.serialize(lesson));
    });
});

/**{@link LessonController#updateLesson}*/
describe("PUT lessons/:lessonId/", () => {
    const makeRequest = async (lessonId: number | string, {data, files = {}}: {
        data?: object; files?: { [key: string]: { value: ""; } | { value: Buffer; fileName?: string, mimeType?: string } };
    }, authToken?: string) => {
        return await fetchWithFiles({
            options: {
                method: "PUT",
                url: `lessons/${lessonId}/`,
                body: {
                    data: data,
                    files: files
                },
            },
            authToken: authToken
        });
    };
    const imagePathRegex = new RegExp(`^${escapeRegExp(`${TEMP_ROOT_FILE_UPLOAD_DIR}/lessons/images/`)}.*-.*\.(png|jpg|jpeg)$`);
    const audioPathRegex = new RegExp(`^${escapeRegExp(`${TEMP_ROOT_FILE_UPLOAD_DIR}/lessons/audios/`)}.*-.*\.(mp3|wav)$`);

    describe("If the lesson exists, user is logged in as author and all fields are valid, update lesson and return 200", async () => {
        test<LocalTestContext>("If optional field are not provided, keep old values", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            vi.spyOn(parserExports, "getParser").mockImplementation((_) => parserExports.parsers["en"]);
            const course = await context.courseFactory.createOne({addedBy: author.profile, language: language});
            const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
            const lesson = await context.lessonFactory.createOne({course: course});

            const oldLessonImage = lesson.image;
            const oldLessonAudio = lesson.audio;
            const updatedLesson = context.lessonFactory.makeOne({course: newCourse, level: lesson.level});

            const response = await makeRequest(lesson.id, {
                data: {
                    courseId: updatedLesson.course.id,
                    title: updatedLesson.title,
                    text: updatedLesson.text
                }
            }, session.token);

            const dbRecord = await context.lessonRepo.findOneOrFail({id: lesson.id}, {populate: ["course", "course.language", "course.addedBy.user"]});
            await context.lessonRepo.annotateVocabsByLevel([dbRecord], author.id);
            await context.courseRepo.annotateVocabsByLevel([dbRecord.course], author.id);
            await context.courseRepo.annotateVocabsByLevel([updatedLesson.course], author.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toMatchObject(lessonSerializer.serialize(updatedLesson, {ignore: ["addedOn"]}));
            expect(lessonSerializer.serialize(dbRecord)).toMatchObject(lessonSerializer.serialize(updatedLesson, {ignore: ["addedOn"]}));
            expect(dbRecord.image).toEqual(oldLessonImage);
            expect(dbRecord.audio).toEqual(oldLessonAudio);
            expect(dbRecord.orderInCourse).toEqual(await newCourse.lessons.loadCount() - 1);

            const [_, lessonWordsText] = parsers["en"].parseText(`${updatedLesson.title} ${updatedLesson.text}`);
            const lessonVocabs = await context.vocabRepo.find({text: lessonWordsText, language: course.language});
            const lessonVocabMappings = await context.em.find(MapLessonVocab, {vocab: lessonVocabs, lesson: dbRecord});

            expect(lessonVocabs.length).toEqual(lessonWordsText.length);
            expect(lessonVocabs.map(v => v.text)).toEqual(expect.arrayContaining(lessonWordsText));
            expect(lessonVocabMappings.length).toEqual(lessonWordsText.length);
        });
        describe("If optional fields are provided, update their values", async () => {
            test<LocalTestContext>("If new image, audio, and level are provided, update them", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                vi.spyOn(parserExports, "getParser").mockImplementation((_) => parserExports.parsers["en"]);
                const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
                const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
                let lesson = await context.lessonFactory.createOne({course: course});
                const oldLessonImage = lesson.image;
                const oldLessonAudio = lesson.audio;
                const updatedLesson = context.lessonFactory.makeOne({course: newCourse, level: randomEnum(LanguageLevel, [lesson.level])});

                const response = await makeRequest(lesson.id, {
                    data: {
                        courseId: newCourse.id,
                        title: updatedLesson.title,
                        text: updatedLesson.text,
                        level: updatedLesson.level
                    },
                    files: {
                        image: readSampleFile("images/lorem-ipsum-69_8KB-1_1ratio.png"),
                        audio: readSampleFile("audio/piano-97_9KB.wav")
                    }
                }, session.token);

                const dbRecord = await context.lessonRepo.findOneOrFail({id: lesson.id}, {populate: ["course", "course.language", "course.addedBy.user"]});
                await context.em.populate(dbRecord, ["course"]);
                await context.lessonRepo.annotateVocabsByLevel([dbRecord], author.id);
                await context.courseRepo.annotateVocabsByLevel([updatedLesson.course], author.id);
                await context.courseRepo.annotateVocabsByLevel([dbRecord.course], author.id);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toMatchObject(lessonSerializer.serialize(updatedLesson, {ignore: ["addedOn", "audio", "image"]}));
                expect(lessonSerializer.serialize(dbRecord)).toMatchObject(lessonSerializer.serialize(updatedLesson, {ignore: ["addedOn", "audio", "image"]}));
                expect(fs.existsSync(dbRecord.image)).toBeTruthy();
                expect(dbRecord.image).not.toEqual(oldLessonImage);
                expect(dbRecord.audio).not.toEqual(oldLessonAudio);
                expect(dbRecord.image).toEqual(expect.stringMatching(imagePathRegex));
                expect(dbRecord.audio).toEqual(expect.stringMatching(audioPathRegex));
                expect(dbRecord.orderInCourse).toEqual(await newCourse.lessons.loadCount() - 1);

                const [_, lessonWordsText] = parsers["en"].parseText(`${updatedLesson.title} ${updatedLesson.text}`);
                const lessonVocabs = await context.vocabRepo.find({text: lessonWordsText, language: course.language});
                const lessonVocabMappings = await context.em.find(MapLessonVocab, {vocab: lessonVocabs, lesson: dbRecord});

                expect(lessonVocabs.length).toEqual(lessonWordsText.length);
                expect(lessonVocabMappings.length).toEqual(lessonWordsText.length);
            });
            test<LocalTestContext>("If new image and audio are blank clear lesson image and audio", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                vi.spyOn(parserExports, "getParser").mockImplementation((_) => parserExports.parsers["en"]);
                const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
                const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
                const lesson = await context.lessonFactory.createOne({course: course});
                const updatedLesson = context.lessonFactory.makeOne({course: newCourse, image: "", audio: ""});

                const response = await makeRequest(lesson.id, {
                    data: {
                        courseId: newCourse.id,
                        title: updatedLesson.title,
                        text: updatedLesson.text,
                    },
                    files: {image: {value: ""}, audio: {value: ""}}
                }, session.token);

                const dbRecord = await context.lessonRepo.findOneOrFail({id: lesson.id}, {populate: ["course", "course.language", "course.addedBy.user"]});
                await context.em.populate(dbRecord, ["course"]);
                await context.lessonRepo.annotateVocabsByLevel([dbRecord], author.id);
                await context.courseRepo.annotateVocabsByLevel([dbRecord.course], author.id);
                await context.courseRepo.annotateVocabsByLevel([updatedLesson.course], author.id);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toMatchObject(lessonSerializer.serialize(updatedLesson, {ignore: ["addedOn"]}));
                expect(lessonSerializer.serialize(dbRecord)).toMatchObject(lessonSerializer.serialize(updatedLesson, {ignore: ["addedOn"]}));
                expect(dbRecord.orderInCourse).toEqual(await newCourse.lessons.loadCount() - 1);

                const [_, lessonWordsText] = parsers["en"].parseText(`${updatedLesson.title} ${updatedLesson.text}`);
                const lessonVocabs = await context.vocabRepo.find({text: lessonWordsText, language: course.language});
                const lessonVocabMappings = await context.em.find(MapLessonVocab, {vocab: lessonVocabs, lesson: dbRecord});

                expect(lessonVocabs.length).toEqual(lessonWordsText.length);
                expect(lessonVocabs.map(v => v.text)).toEqual(expect.arrayContaining(lessonWordsText));
                expect(lessonVocabMappings.length).toEqual(lessonWordsText.length);
            });
        });
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
        const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
        const lesson = await context.lessonFactory.createOne({course: course});
        const updatedLesson = context.lessonFactory.makeOne({course: course});

        const response = await makeRequest(lesson.id, {
            data: {
                courseId: newCourse.id,
                title: updatedLesson.title,
                text: updatedLesson.text,
            }
        });

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
        const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
        const lesson = await context.lessonFactory.createOne({course: course});
        const updatedLesson = context.lessonFactory.makeOne({course: course});

        const response = await makeRequest(lesson.id, {
            data: {
                courseId: newCourse.id,
                title: updatedLesson.title,
                text: updatedLesson.text,
            }
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
    test<LocalTestContext>("If lesson does not exist return 404", async (context) => {
        const author = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: author});
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
        const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
        const updatedLesson = await context.lessonFactory.makeOne({course: course});

        const response = await makeRequest(faker.random.numeric(20), {
            data: {
                courseId: newCourse.id,
                title: updatedLesson.title,
                text: updatedLesson.text,
            }
        }, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If lesson is not public and user is not author return 404", async (context) => {
        const author = await context.userFactory.createOne();
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: otherUser});
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: [], isPublic: false});
        const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
        const lesson = await context.lessonFactory.createOne({course: course});
        const updatedLesson = await context.lessonFactory.makeOne({course: course});

        const response = await makeRequest(lesson.id, {
            data: {
                courseId: newCourse.id,
                title: updatedLesson.title,
                text: updatedLesson.text,
            }
        }, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If lesson is public but user is not author of lesson course return 403", async (context) => {
        const author = await context.userFactory.createOne();
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: otherUser});
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: [], isPublic: true});
        const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
        const lesson = await context.lessonFactory.createOne({course: course});
        const updatedLesson = await context.lessonFactory.makeOne({course: course});

        const response = await makeRequest(lesson.id, {
            data: {
                courseId: newCourse.id,
                title: updatedLesson.title,
                text: updatedLesson.text,
            }
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
    describe("If required fields are missing return 400", async () => {
        test<LocalTestContext>("If title is missing return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
            const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
            let lesson = await context.lessonFactory.createOne({course: course});

            const updatedLesson = await context.lessonFactory.makeOne({course: course});

            const response = await makeRequest(lesson.id, {
                data: {
                    courseId: newCourse.id,
                    text: updatedLesson.text,
                }
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If text is missing return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
            const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
            let lesson = await context.lessonFactory.createOne({course: course});

            const updatedLesson = await context.lessonFactory.makeOne({course: course});

            const response = await makeRequest(lesson.id, {
                data: {
                    courseId: newCourse.id,
                    title: updatedLesson.title,
                }
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If courseId is missing return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({addedBy: author.profile, language, lessons: []});
            let lesson = await context.lessonFactory.createOne({course: course});

            const updatedLesson = await context.lessonFactory.makeOne({course: course});

            const response = await makeRequest(lesson.id, {
                data: {
                    title: updatedLesson.title,
                    text: updatedLesson.text,
                }
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If data is missing return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
            let lesson = await context.lessonFactory.createOne({course: course});

            const response = await makeRequest(lesson.id, {}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 4xx", async () => {
        test<LocalTestContext>("If title is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
            const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
            let lesson = await context.lessonFactory.createOne({course: course});

            const updatedLesson = await context.lessonFactory.makeOne({course: course});

            const response = await makeRequest(lesson.id, {
                data: {
                    courseId: newCourse.id,
                    title: faker.random.alpha({count: 150}),
                    text: updatedLesson.text,
                }
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If text is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
            const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
            let lesson = await context.lessonFactory.createOne({course: course});

            const updatedLesson = await context.lessonFactory.makeOne({course: course});

            const response = await makeRequest(lesson.id, {
                data: {
                    courseId: newCourse.id,
                    title: updatedLesson.title,
                    text: faker.random.alpha({count: 60_000}),
                }
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        describe("If course is invalid return 400", async () => {
            test<LocalTestContext>("If course id is not a number return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
                let lesson = await context.lessonFactory.createOne({course: course});

                const updatedLesson = await context.lessonFactory.makeOne({course: course});

                const response = await makeRequest(lesson.id, {
                    data: {
                        courseId: faker.random.alpha(3),
                        title: updatedLesson.title,
                        text: updatedLesson.text,
                    }
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If course does not exist return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
                let lesson = await context.lessonFactory.createOne({course: course});

                const updatedLesson = context.lessonFactory.makeOne({course: course});

                const response = await makeRequest(lesson.id, {
                    data: {
                        courseId: faker.datatype.number({min: 10000}),
                        title: updatedLesson.title,
                        text: updatedLesson.text,
                    }
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If user is not author of course and course is not public return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: user.profile, language: language, lessons: []});
                const newCourse = await context.courseFactory.createOne({addedBy: otherUser.profile, language: language, isPublic: false});
                let lesson = await context.lessonFactory.createOne({course: course});

                const updatedLesson = await context.lessonFactory.makeOne({course: course});

                const response = await makeRequest(lesson.id, {
                    data: {
                        courseId: newCourse.id,
                        title: updatedLesson.title,
                        text: updatedLesson.text,
                    }
                }, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If user is not author of course and course is public return 403", async (context) => {
                const user = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: user.profile, language: language, lessons: []});
                const newCourse = await context.courseFactory.createOne({addedBy: otherUser.profile, language: language, isPublic: true});
                let lesson = await context.lessonFactory.createOne({course: course});

                const updatedLesson = await context.lessonFactory.makeOne({course: course});

                const response = await makeRequest(lesson.id, {
                    data: {
                        courseId: newCourse.id,
                        title: updatedLesson.title,
                        text: updatedLesson.text,
                    }
                }, session.token);
                expect(response.statusCode).to.equal(403);
            });
            test<LocalTestContext>("If course is not in the same language as old course return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const otherLanguage = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
                const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: otherLanguage});
                let lesson = await context.lessonFactory.createOne({course: course});

                const updatedLesson = await context.lessonFactory.makeOne({course: course});

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
        describe("If image is invalid return 4xx", async () => {
            test<LocalTestContext>("If image is not a jpeg or png return 415", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
                const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
                let lesson = await context.lessonFactory.createOne({course: course});

                const updatedLesson = await context.lessonFactory.makeOne({course: course});

                const response = await makeRequest(lesson.id, {
                    data: {
                        courseId: newCourse.id,
                        title: updatedLesson.title,
                        text: updatedLesson.text,
                    },
                    files: {image: readSampleFile("images/audio-468_4KB.png")}
                }, session.token);

                expect(response.statusCode).to.equal(415);
            });
            // test<LocalTestContext>("If image is corrupted return 415", async (context) => {});
            test<LocalTestContext>("If the image file is more than 500KB return 413", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
                const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
                let lesson = await context.lessonFactory.createOne({course: course});
                const updatedLesson = await context.lessonFactory.makeOne({course: course});
                vi.spyOn(fileValidatorExports, "validateFileFields").mockImplementation(mockValidateFileFields({"image": 510 * 1024}));

                const response = await makeRequest(lesson.id, {
                    data: {
                        courseId: newCourse.id,
                        title: updatedLesson.title,
                        text: updatedLesson.text,
                    },
                    files: {image: readSampleFile("images/lorem-ipsum-69_8KB-1_1ratio.png")}
                }, session.token);

                expect(response.statusCode).to.equal(413);
            });
            test<LocalTestContext>("If the image is not square return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
                const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
                let lesson = await context.lessonFactory.createOne({course: course});

                const updatedLesson = await context.lessonFactory.makeOne({course: course});

                const response = await makeRequest(lesson.id, {
                    data: {
                        courseId: newCourse.id,
                        title: updatedLesson.title,
                        text: updatedLesson.text,
                    },
                    files: {image: readSampleFile("images/rectangle-5_2KB-2_1ratio.png")}
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
        describe("If audio is invalid return 4xx", async () => {
            test<LocalTestContext>("If audio is not a mpeg or wav or ogg return 415", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
                const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
                let lesson = await context.lessonFactory.createOne({course: course});

                const updatedLesson = await context.lessonFactory.makeOne({course: course});

                const response = await makeRequest(lesson.id, {
                    data: {
                        courseId: newCourse.id,
                        title: updatedLesson.title,
                        text: updatedLesson.text,
                    },
                    files: {audio: readSampleFile("audio/image-69_8KB.wav")}
                }, session.token);

                expect(response.statusCode).to.equal(415);
            });
            // test<LocalTestContext>("If audio is corrupted return 415", async (context) => {});
            test<LocalTestContext>("If the audio file is more than 100MB return 413", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
                const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
                let lesson = await context.lessonFactory.createOne({course: course});
                const updatedLesson = await context.lessonFactory.makeOne({course: course});
                vi.spyOn(fileValidatorExports, "validateFileFields").mockImplementation(mockValidateFileFields({"audio": 110 * 1024 * 1024}));

                const response = await makeRequest(lesson.id, {
                    data: {
                        courseId: newCourse.id,
                        title: updatedLesson.title,
                        text: updatedLesson.text,
                    },
                    files: {
                        audio: readSampleFile("audio/piano-97_9KB.wav")
                    }
                }, session.token);

                expect(response.statusCode).to.equal(413);
            });
        });
    });
});

/**{@link LessonController#getUserLessonsHistory}*/
describe("GET users/:username/lessons/history/", () => {
    const makeRequest = async (username: string | "me", queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/${username}/lessons/history/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const queryDefaults = {pagination: {pageSize: 10, page: 1}};
    const defaultSortComparator = createComparator(Lesson, [
        {property: "title", order: "asc"},
        {property: "id", order: "asc"}]
    );
    describe("If user is logged in and there are no filters return lessons in user history", () => {
        test<LocalTestContext>("If username is me", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({language: language, isPublic: true});
            const expectedLessons = await context.lessonFactory.create(3, {course, pastViewers: [user.profile]});
            await context.lessonFactory.create(3, {course});
            context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.profile.id);
            expectedLessons.sort(defaultSortComparator);
            const recordsCount = expectedLessons.length;

            const response = await makeRequest("me", {}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonSerializer.serializeList(expectedLessons)
            });
        });
        test<LocalTestContext>("If username belongs to the currently logged in user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({language: language, isPublic: true});
            const expectedLessons = await context.lessonFactory.create(3, {course, pastViewers: [user.profile]});
            await context.lessonFactory.create(3, {course});
            context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.profile.id);
            expectedLessons.sort(defaultSortComparator);
            const recordsCount = expectedLessons.length;

            const response = await makeRequest(user.username, {}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonSerializer.serializeList(expectedLessons)
            });
        });
    });
    describe("test languageCode filter", () => {
        test<LocalTestContext>("If language filter is valid and language exists only return public lessons in that language", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            const course1 = await context.courseFactory.createOne({language: language1, isPublic: true});
            const course2 = await context.courseFactory.createOne({language: language2, isPublic: true});
            const expectedLessons = await context.lessonFactory.create(3, {course: course1, pastViewers: [user.profile]});
            await context.lessonFactory.create(3, {course: course2, pastViewers: [user.profile]});
            await context.lessonFactory.create(3, {course: course1});
            expectedLessons.sort(defaultSortComparator);
            await context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.id);
            const recordsCount = expectedLessons.length;

            const response = await makeRequest("me", {languageCode: language1.code}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonSerializer.serializeList(expectedLessons)
            });
        });
        test<LocalTestContext>("If language does not exist return empty lessons list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            await context.lessonFactory.create(3, {
                course: await context.courseFactory.createOne({
                    language: await context.languageFactory.createOne(),
                    isPublic: true
                }),
                pastViewers: [user.profile]
            });
            const response = await makeRequest("me", {languageCode: faker.random.alpha({count: 4})}, session.token);

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
            const response = await makeRequest("me", {languageCode: 12345}, session.token);
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
            const course1 = await context.courseFactory.createOne({language, addedBy: user1.profile, isPublic: true});
            const course2 = await context.courseFactory.createOne({language, addedBy: user2.profile, isPublic: true});
            const privateCourse1 = await context.courseFactory.createOne({language, addedBy: user1.profile, isPublic: false});
            const expectedLessons = await context.lessonFactory.create(3, {course: course1, pastViewers: [user.profile]});
            await context.lessonFactory.create(3, {course: course2, pastViewers: [user.profile]});
            await context.lessonFactory.create(3, {course: privateCourse1, pastViewers: [user.profile]});
            await context.lessonFactory.create(3, {course: course1});
            expectedLessons.sort(defaultSortComparator);
            await context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.id);
            const recordsCount = expectedLessons.length;

            const response = await makeRequest("me", {addedBy: user1.username}, session.token);

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
            const session = await context.sessionFactory.createOne({user: user});
            const otherUser = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const course1 = await context.courseFactory.createOne({language, addedBy: user.profile, isPublic: false});
            const course2 = await context.courseFactory.createOne({language, addedBy: otherUser.profile, isPublic: true});
            const expectedLessons = await context.lessonFactory.create(3, {course: course1, pastViewers: [user.profile]});
            await context.lessonFactory.create(3, {course: course2, pastViewers: [user.profile]});
            await context.lessonFactory.create(3, {course: course1});
            expectedLessons.sort(defaultSortComparator);
            await context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.id);
            const recordsCount = expectedLessons.length;

            const response = await makeRequest("me", {addedBy: "me"}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonSerializer.serializeList(expectedLessons)
            });
        });
        test<LocalTestContext>("If user does not exist return empty lesson list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            await context.lessonFactory.create(3, {
                course: await context.courseFactory.createOne({
                    language: await context.languageFactory.createOne(),
                    isPublic: true
                }),
                pastViewers: [user.profile]
            });

            const response = await makeRequest("me", {addedBy: faker.random.alpha({count: 20})}, session.token);

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
            const session = await context.sessionFactory.createOne({user: user});
            const response = await makeRequest("me", {addedBy: "!@#%#%^#^!"}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test searchQuery filter", () => {
        test<LocalTestContext>("If searchQuery is valid return lessons with query in title", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const searchQuery = "search query";
            const course = await context.courseFactory.createOne({language: language, isPublic: true});
            const expectedLessons = [
                await context.lessonFactory.createOne({
                    course, pastViewers: [user.profile], title: `${randomCase(searchQuery)}-${faker.random.alpha(10)}`
                }),
                await context.lessonFactory.createOne({
                    course, pastViewers: [user.profile], title: `${randomCase(searchQuery)}-${faker.random.alpha(10)}`
                }),
                await context.lessonFactory.createOne({
                    course, pastViewers: [user.profile], title: `${randomCase(searchQuery)}-${faker.random.alpha(10)}`
                })
            ];
            expectedLessons.sort(defaultSortComparator);
            await context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.id);
            await context.lessonFactory.create(3, {course, pastViewers: [user.profile]});
            await context.lessonFactory.create(3, {course});
            const recordsCount = expectedLessons.length;

            const response = await makeRequest("me", {searchQuery: searchQuery}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonSerializer.serializeList(expectedLessons)
            });
        });
        test<LocalTestContext>("If searchQuery is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const response = await makeRequest("me", {searchQuery: faker.random.alpha({count: 300})}, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If no lessons match search query return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({language: language, isPublic: true});
            await context.lessonFactory.create(3, {course, pastViewers: [user.profile]});
            await context.lessonFactory.create(3, {course});


            const response = await makeRequest("me", {searchQuery: faker.random.alpha({count: 200})}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: 0,
                data: []
            });
        });
    });
    describe("test level filter", () => {
        test<LocalTestContext>("If the level is valid return lessons in that level", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({language, isPublic: true});
            const level = randomEnum(LanguageLevel);
            const expectedLessons = await context.lessonFactory.create(3, {course, pastViewers: [user.profile], level});
            await context.lessonFactory.create(3, {course, pastViewers: [user.profile], level: randomEnum(LanguageLevel, [level])});
            await context.lessonFactory.create(3, {course, level});
            expectedLessons.sort(defaultSortComparator);
            await context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.id);
            const recordsCount = expectedLessons.length;

            const response = await makeRequest("me", {level: level}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonSerializer.serializeList(expectedLessons)
            });
        });
        test<LocalTestContext>("If multiple levels are sent return lessons in any of those levels", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({language, isPublic: true});
            const levels = randomEnums(2, LanguageLevel);
            const expectedLessons = (await Promise.all(levels.map(level => context.lessonFactory.create(3, {
                course,
                level,
                pastViewers: [user.profile],
            })))).flat();
            await context.lessonFactory.create(3, {course, pastViewers: [user.profile], level: randomEnum(LanguageLevel, levels)});
            await Promise.all(levels.map(level => context.lessonFactory.create(3, {course, level})));
            expectedLessons.sort(defaultSortComparator);
            await context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.id);
            const recordsCount = expectedLessons.length;

            const response = await makeRequest("me", {level: levels}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonSerializer.serializeList(expectedLessons)
            });
        });
        test<LocalTestContext>("If the level is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const response = await makeRequest("me", {level: "hard"}, session.token);

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test hasAudio filter", () => {
        test<LocalTestContext>("If hasAudio is true return lessons with audio", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({language, isPublic: true});
            const audio = "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg";
            const expectedLessons = await context.lessonFactory.create(3, {course, pastViewers: [user.profile], audio});
            await context.lessonFactory.create(3, {course, pastViewers: [user.profile], audio: ""});
            await context.lessonFactory.create(3, {course, audio});
            expectedLessons.sort(defaultSortComparator);
            await context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.id);
            const recordsCount = expectedLessons.length;

            const response = await makeRequest("me", {hasAudio: true}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonSerializer.serializeList(expectedLessons)
            });
        });
        test<LocalTestContext>("If hasAudio is false return lessons with no audio", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({language, isPublic: true});
            const audio = "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg";
            const expectedLessons = await context.lessonFactory.create(3, {course, pastViewers: [user.profile], audio: ""});
            await context.lessonFactory.create(3, {course, pastViewers: [user.profile], audio});
            await context.lessonFactory.create(3, {course, audio});
            expectedLessons.sort(defaultSortComparator);
            await context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.id);
            const recordsCount = expectedLessons.length;

            const response = await makeRequest("me", {hasAudio: false}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: lessonSerializer.serializeList(expectedLessons)
            });
        });
        test<LocalTestContext>("If hasAudio is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const response = await makeRequest("me", {hasAudio: "maybe?"}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test sort", () => {
        describe("test sortBy", () => {
            test<LocalTestContext>("test sortBy title", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language: language, isPublic: true});
                const expectedLessons = [
                    await context.lessonFactory.createOne({course, pastViewers: [user.profile], title: "abc"}),
                    await context.lessonFactory.createOne({course, pastViewers: [user.profile], title: "def"})
                ];
                await context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.id);
                const recordsCount = expectedLessons.length;

                const response = await makeRequest("me", {sortBy: "title"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: lessonSerializer.serializeList(expectedLessons)
                });
            });
            test<LocalTestContext>("test sortBy createdDate", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language: language, isPublic: true});

                const expectedLessons = [
                    await context.lessonFactory.createOne({
                        course,
                        pastViewers: [user.profile],
                        addedOn: new Date("2018-07-22T10:30:45.000Z")
                    }),
                    await context.lessonFactory.createOne({
                        course,
                        pastViewers: [user.profile],
                        addedOn: new Date("2023-03-15T20:29:42.000Z")
                    }),
                ];
                await context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.id);
                const recordsCount = expectedLessons.length;

                const response = await makeRequest("me", {sortBy: "createdDate"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: lessonSerializer.serializeList(expectedLessons)
                });
            });
            test<LocalTestContext>("test sortBy pastViewersCount", async (context) => {
                const user = await context.userFactory.createOne();
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language: language, isPublic: true});
                const otherUser = await context.userFactory.createOne();
                const expectedLessons = [
                    await context.lessonFactory.createOne({course, pastViewers: [user.profile]}),
                    await context.lessonFactory.createOne({course, pastViewers: [user.profile, user1.profile]}),
                    await context.lessonFactory.createOne({course, pastViewers: [user.profile, user1.profile, user2.profile]})
                ];
                await context.lessonFactory.createOne({course});
                await context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.id);
                const recordsCount = expectedLessons.length;

                const response = await makeRequest("me", {sortBy: "pastViewersCount"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: lessonSerializer.serializeList(expectedLessons)
                });
            });
            test<LocalTestContext>("if sortBy is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});

                const response = await makeRequest("me", {sortBy: "text"}, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<LocalTestContext>("If sortOrder is asc return the lessons in ascending order", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language: language, isPublic: true});
                const expectedLessons = [
                    await context.lessonFactory.createOne({course, pastViewers: [user.profile], title: "abc"}),
                    await context.lessonFactory.createOne({course, pastViewers: [user.profile], title: "def"})
                ];
                await context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.id);
                const recordsCount = expectedLessons.length;

                const response = await makeRequest("me", {sortOrder: "asc"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: lessonSerializer.serializeList(expectedLessons)
                });
            });
            test<LocalTestContext>("If sortOrder is desc return the lessons in descending order", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language: language, isPublic: true});
                const expectedLessons = [
                    await context.lessonFactory.createOne({course, pastViewers: [user.profile], title: "def"}),
                    await context.lessonFactory.createOne({course, pastViewers: [user.profile], title: "abc"}),
                ];
                await context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.id);
                const recordsCount = expectedLessons.length;

                const response = await makeRequest("me", {sortOrder: "desc"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: lessonSerializer.serializeList(expectedLessons)
                });
            });
            test<LocalTestContext>("If sortBy is invalid return 400", async (context) => {
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
                const course = await context.courseFactory.createOne({language: language, isPublic: true});
                const allLessons = await context.lessonFactory.create(10, {course, pastViewers: [user.profile]});
                await context.lessonFactory.create(3, {course});
                allLessons.sort(defaultSortComparator);
                const recordsCount = allLessons.length;
                const page = 1, pageSize = 3;
                const expectedLessons = allLessons.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.id);

                const response = await makeRequest("me", {page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: lessonSerializer.serializeList(expectedLessons)
                });
            });
            test<LocalTestContext>("If page is 2 return the second page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language: language, isPublic: true});
                const allLessons = await context.lessonFactory.create(10, {course, pastViewers: [user.profile]});
                await context.lessonFactory.create(3, {course});
                allLessons.sort(defaultSortComparator);
                const recordsCount = allLessons.length;
                const page = 2, pageSize = 3;
                const expectedLessons = allLessons.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.id);

                const response = await makeRequest("me", {page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: lessonSerializer.serializeList(expectedLessons)
                });
            });
            test<LocalTestContext>("If page is last return the last page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language: language, isPublic: true});
                const allLessons = await context.lessonFactory.create(10, {course, pastViewers: [user.profile]});
                await context.lessonFactory.create(3, {course});
                allLessons.sort(defaultSortComparator);
                const recordsCount = allLessons.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedLessons = allLessons.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.id);

                const response = await makeRequest("me", {page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: lessonSerializer.serializeList(expectedLessons)
                });
            });
            test<LocalTestContext>("If page is more than last return empty page", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language: language, isPublic: true});
                const allLessons = await context.lessonFactory.create(10, {course, pastViewers: [user.profile]});
                await context.lessonFactory.create(3, {course});
                allLessons.sort(defaultSortComparator);
                const recordsCount = allLessons.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize) + 1;
                const expectedLessons = allLessons.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.id);

                const response = await makeRequest("me", {page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: lessonSerializer.serializeList(expectedLessons)
                });

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
            test<LocalTestContext>("If pageSize is 20 split the results into 20 sized pages", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language: language, isPublic: true});
                const allLessons = await context.lessonFactory.create(50, {course, pastViewers: [user.profile]});
                allLessons.sort(defaultSortComparator);
                const recordsCount = allLessons.length;
                const page = 1, pageSize = 20;
                const expectedLessons = allLessons.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.lessonRepo.annotateVocabsByLevel(expectedLessons, user.id);

                const response = await makeRequest("me", {page, pageSize}, session.token);

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
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest("me", {page: 1, pageSize: 250}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If pageSize is negative return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest("me", {page: 1, pageSize: -20}, session.token);

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
    test<LocalTestContext>("If user is not logged in return 401", async () => {
        const response = await makeRequest("me");
        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const response = await makeRequest("me", {}, session.token);
        expect(response.statusCode).to.equal(403);
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

/**{@link LessonController#addLessonToUserHistory}*/
describe("POST users/:username/lessons/history/", () => {
    const makeRequest = async (username: string | "me", body: object, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `users/${username}/lessons/history/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };
    describe("If the lesson exists and is public and user is learning lesson language add lesson to user's lesson history", () => {
        test<LocalTestContext>("If username is me", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const course = await context.courseFactory.createOne({language, isPublic: true});
            const expectedLesson = await context.lessonFactory.createOne({course});
            await context.lessonRepo.annotateVocabsByLevel([expectedLesson], user.id);
            await context.courseRepo.annotateVocabsByLevel([expectedLesson.course], user.id);

            const response = await makeRequest("me", {lessonId: expectedLesson.id}, session.token);

            expectedLesson.pastViewersCount++;
            expect(response.statusCode).to.equal(201);
            expect(response.json()).toEqual(lessonSerializer.serialize(expectedLesson));
            const dbRecord = await context.em.findOne(MapPastViewerLesson, {
                pastViewer: user.profile, lesson: expectedLesson
            }, {populate: ["lesson"]});
            expect(dbRecord).not.toBeNull();
            expect(lessonSerializer.serialize(dbRecord!.lesson)).toEqual(lessonSerializer.serialize(expectedLesson));
        });
        test<LocalTestContext>("If username is belongs to the current user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const course = await context.courseFactory.createOne({language, isPublic: true});
            const expectedLesson = await context.lessonFactory.createOne({course});
            await context.lessonRepo.annotateVocabsByLevel([expectedLesson], user.id);
            await context.courseRepo.annotateVocabsByLevel([expectedLesson.course], user.id);

            const response = await makeRequest(user.username, {lessonId: expectedLesson.id}, session.token);

            expectedLesson.pastViewersCount++;
            expect(response.statusCode).to.equal(201);
            expect(response.json()).toEqual(lessonSerializer.serialize(expectedLesson));
            const dbRecord = await context.em.findOne(MapPastViewerLesson, {
                pastViewer: user.profile, lesson: expectedLesson
            }, {populate: ["lesson"]});
            expect(dbRecord).not.toBeNull();
            expect(lessonSerializer.serialize(dbRecord!.lesson)).toEqual(lessonSerializer.serialize(expectedLesson));
        });
    });
    test<LocalTestContext>("If lesson is already in user history add it again with newer timestamp", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const course = await context.courseFactory.createOne({language, isPublic: true});
        const expectedLesson = await context.lessonFactory.createOne({course, pastViewers: user.profile});
        await context.lessonRepo.annotateVocabsByLevel([expectedLesson], user.id);
        await context.courseRepo.annotateVocabsByLevel([expectedLesson.course], user.id);

        const response = await makeRequest("me", {lessonId: expectedLesson.id}, session.token);

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

            const response = await makeRequest("me", {}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 400", function () {
        describe("If the lesson is invalid return 400", async () => {
            test<LocalTestContext>("If the lessonId is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest("me", {lessonId: faker.random.alpha(10)}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If the lesson is not found return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest("me", {lessonId: faker.datatype.number({min: 100000})}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If the lesson is not public and the user is logged in as author return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const author = await context.userFactory.createOne();
                const language = await context.languageFactory.createOne({learners: user.profile});
                const course = await context.courseFactory.createOne({language, isPublic: false, addedBy: author.profile});
                const lesson = await context.lessonFactory.createOne({course});

                const response = await makeRequest("me", {lessonId: lesson.id}, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If the lesson is not in a language the user is learning return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language, isPublic: true});
                const lesson = await context.lessonFactory.createOne({course});

                const response = await makeRequest("me", {lessonId: lesson.id}, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
    });
    test<LocalTestContext>("If user is not logged in return 401", async () => {
        const response = await makeRequest("me", {});
        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({language, isPublic: true});
        const lesson = await context.lessonFactory.createOne({course});

        const response = await makeRequest("me", {lessonId: lesson.id}, session.token);
        expect(response.statusCode).to.equal(403);
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
        await context.languageFactory.create(10, {learners: user.profile});

        const response = await makeRequest(otherUser.username, {}, session.token);
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>(`If username exists and is public and not authenticated as user return 403`, async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const otherUser = await context.userFactory.createOne({profile: {isPublic: true}});
        await context.languageFactory.create(10, {learners: user.profile});

        const response = await makeRequest(otherUser.username, {}, session.token);
        expect(response.statusCode).to.equal(403);
    });
});
