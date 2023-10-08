import {beforeEach, describe, expect, test, TestContext, vi} from "vitest";
import {orm} from "@/src/server.js";
import {
    buildQueryString,
    createComparator,
    fetchRequest,
    fetchWithFiles,
    mockValidateFileFields,
    readSampleFile
} from "@/tests/integration/utils.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";
import {CourseFactory} from "@/src/seeders/factories/CourseFactory.js";
import {Course} from "@/src/models/entities/Course.js";
import {CourseRepo} from "@/src/models/repos/CourseRepo.js";
import {InjectOptions} from "light-my-request";
import {LanguageFactory} from "@/src/seeders/factories/LanguageFactory.js";
import {faker} from "@faker-js/faker";
import {randomCase, shuffleArray} from "@/tests/utils.js";
import {defaultVocabsByLevel} from "@/src/models/enums/VocabLevel.js";
import fs from "fs-extra";
import {LessonFactory} from "@/src/seeders/factories/LessonFactory.js";
import {LessonRepo} from "@/src/models/repos/LessonRepo.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {courseSerializer} from "@/src/presentation/response/serializers/entities/CourseSerializer";
import {CourseSchema, LessonSchema} from "dzelda-types";
import * as fileValidatorExports from "@/src/validators/fileValidator.js";
import * as constantExports from "@/src/constants.js";
import {TEMP_ROOT_FILE_UPLOAD_DIR} from "@/tests/testConstants.js";
import {escapeRegExp} from "@/src/utils/utils.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {MapBookmarkerCourse} from "@/src/models/entities/MapBookmarkerCourse.js";

interface LocalTestContext extends TestContext {
    courseRepo: CourseRepo;
    lessonRepo: LessonRepo;
    languageFactory: LanguageFactory;
    courseFactory: CourseFactory;
    lessonFactory: LessonFactory;
}

beforeEach<LocalTestContext>(async (context) => {
    await orm.getSchemaGenerator().clearDatabase();
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.profileFactory = new ProfileFactory(context.em);
    context.sessionFactory = new SessionFactory(context.em);
    context.courseFactory = new CourseFactory(context.em);
    context.lessonFactory = new LessonFactory(context.em);
    context.languageFactory = new LanguageFactory(context.em);
    context.lessonRepo = context.em.getRepository(Lesson) as LessonRepo;
    context.courseRepo = context.em.getRepository(Course) as CourseRepo;
    vi.spyOn(constantExports, "ROOT_UPLOAD_DIR", "get").mockReturnValue(TEMP_ROOT_FILE_UPLOAD_DIR);
});

/**{@link CourseController#getCourses}*/
describe("GET courses/", function () {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `courses/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const queryDefaults = {pagination: {pageSize: 10, page: 1}};
    const defaultSortComparator = createComparator(Course, [
        {property: "title", order: "asc"},
        {property: "id", order: "asc"}]
    );
    test<LocalTestContext>("If there are no filters return all public courses", async (context) => {
        const language = await context.languageFactory.createOne();
        const expectedCourses = await context.courseFactory.create(5, {language, isPublic: true});
        await context.courseFactory.create(5, {language, isPublic: false});
        expectedCourses.sort(defaultSortComparator);
        const recordsCount = expectedCourses.length;

        const response = await makeRequest();

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: courseSerializer.serializeList(expectedCourses)
        });
    });
    describe("test languageCode filter", () => {
        test<LocalTestContext>("If language filter is valid and language exists only return public courses in that language", async (context) => {
            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            const expectedCourses = await context.courseFactory.create(3, {language: language1, isPublic: true});
            await context.courseFactory.create(3, {language: language2, isPublic: true});
            await context.courseFactory.create(3, {language: language1, isPublic: false});
            expectedCourses.sort(defaultSortComparator);
            const recordsCount = expectedCourses.length;

            const response = await makeRequest({languageCode: language1.code});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: courseSerializer.serializeList(expectedCourses)
            });
        });
        test<LocalTestContext>("If language does not exist return empty course list", async (context) => {
            await context.courseFactory.create(3, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({languageCode: faker.random.alpha({count: 4})});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: 0,
                data: []
            });
        });
        test<LocalTestContext>("If language filter is invalid return 400", async (context) => {
            const response = await makeRequest({languageCode: 12345});
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test addedBy filter", () => {
        test<LocalTestContext>("If addedBy filter is valid and user exists only return public courses added by that user", async (context) => {
            const user1 = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const expectedCourses = await context.courseFactory.create(3, {language, addedBy: user1.profile, isPublic: true});
            await context.courseFactory.create(3, {language});
            await context.courseFactory.create(3, {language, addedBy: user1.profile, isPublic: false});
            expectedCourses.sort(defaultSortComparator);
            const recordsCount = expectedCourses.length;

            const response = await makeRequest({addedBy: user1.username});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: courseSerializer.serializeList(expectedCourses)
            });
        });
        test<LocalTestContext>("If addedBy is me and signed in return courses added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const expectedCourses = [
                ...await context.courseFactory.create(3, {language, addedBy: user.profile, isPublic: true}),
                ...await context.courseFactory.create(3, {language, addedBy: user.profile, isPublic: false})
            ];
            await context.courseRepo.annotateVocabsByLevel(expectedCourses, user.profile.id);
            await context.courseFactory.create(3, {language});

            expectedCourses.sort(defaultSortComparator);
            const recordsCount = expectedCourses.length;

            const response = await makeRequest({addedBy: "me"}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: courseSerializer.serializeList(expectedCourses)
            });
        });
        test<LocalTestContext>("If addedBy is me and not signed in return 401", async (context) => {
            const response = await makeRequest({addedBy: "me"});
            expect(response.statusCode).to.equal(401);
        });
        test<LocalTestContext>("If user does not exist return empty course list", async (context) => {
            await context.courseFactory.create(3, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({addedBy: faker.random.alpha({count: 20})});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: 0,
                data: []
            });
        });
        test<LocalTestContext>("If addedBy filter is invalid return 400", async (context) => {
            const response = await makeRequest({addedBy: "!@#%#%^#^!"});
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test searchQuery filter", () => {
        test<LocalTestContext>("If searchQuery is valid return courses with query in title or description", async (context) => {
            const language = await context.languageFactory.createOne();
            const searchQuery = "search query";
            const expectedCourses = [
                await context.courseFactory.createOne({
                    language,
                    isPublic: true,
                    title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`
                }),
                await context.courseFactory.createOne({
                    language,
                    isPublic: true,
                    description: `description ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`
                })
            ];
            await context.courseFactory.create(3, {language: language});
            expectedCourses.sort(defaultSortComparator);
            const recordsCount = expectedCourses.length;

            const response = await makeRequest({searchQuery: searchQuery});
            expect(response.statusCode).to.equal(200);

            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: courseSerializer.serializeList(expectedCourses)
            });
        });
        test<LocalTestContext>("If searchQuery is invalid return 400", async (context) => {
            const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})});

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If no courses match search query return empty list", async (context) => {
            await context.courseFactory.create(3, {language: await context.languageFactory.createOne(), isPublic: true});

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
            test<LocalTestContext>("test sortBy title", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedCourses = [
                    await context.courseFactory.createOne({title: "abc", isPublic: true, language}),
                    await context.courseFactory.createOne({title: "def", isPublic: true, language})
                ];
                const recordsCount = expectedCourses.length;

                const response = await makeRequest({sortBy: "title"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: courseSerializer.serializeList(expectedCourses)
                });
            });
            test<LocalTestContext>("test sortBy createdDate", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedCourses = [
                    await context.courseFactory.createOne({addedOn: new Date("2018-07-22T10:30:45.000Z"), isPublic: true, language}),
                    await context.courseFactory.createOne({addedOn: new Date("2023-03-15T20:29:42.000Z"), isPublic: true, language}),
                ];
                const recordsCount = expectedCourses.length;

                const response = await makeRequest({sortBy: "createdDate"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: courseSerializer.serializeList(expectedCourses)
                });
            });
            test<LocalTestContext>("test sortBy avgPastViewersCountPerLesson", async (context) => {
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();

                const language = await context.languageFactory.createOne();
                const expectedCourses = [
                    await context.courseFactory.createOne({
                        language,
                        isPublic: true,
                        lessons: []
                    }),
                    await context.courseFactory.createOne({
                        language,
                        isPublic: true,
                        lessons: [context.lessonFactory.makeOne({pastViewers: []})]
                    }),
                    await context.courseFactory.createOne({
                        language, isPublic: true,
                        lessons: [context.lessonFactory.makeOne({pastViewers: [user1.profile]})]
                    }),
                    await context.courseFactory.createOne({
                        language, isPublic: true,
                        lessons: [context.lessonFactory.makeOne({pastViewers: [user1.profile, user2.profile]})]
                    }),
                ];
                const recordsCount = expectedCourses.length;

                const response = await makeRequest({sortBy: "avgPastViewersCountPerLesson"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: courseSerializer.serializeList(expectedCourses)
                });
            });
            test<LocalTestContext>("if sortBy is invalid return 400", async (context) => {
                const response = await makeRequest({sortBy: "lessons"});
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<LocalTestContext>("test sortOrder ascending", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedCourses = [
                    await context.courseFactory.createOne({title: "abc", isPublic: true, language}),
                    await context.courseFactory.createOne({title: "def", isPublic: true, language})
                ];
                const recordsCount = expectedCourses.length;

                const response = await makeRequest({sortOrder: "asc"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: courseSerializer.serializeList(expectedCourses)
                });
            });
            test<LocalTestContext>("test sortOrder descending", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedCourses = [
                    await context.courseFactory.createOne({title: "def", isPublic: true, language}),
                    await context.courseFactory.createOne({title: "abc", isPublic: true, language}),
                ];
                const recordsCount = expectedCourses.length;

                const response = await makeRequest({sortOrder: "desc"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: courseSerializer.serializeList(expectedCourses)
                });
            });
            test<LocalTestContext>("if sortBy is invalid return 400", async (context) => {
                const response = await makeRequest({sortOrder: "rising"});
                expect(response.statusCode).to.equal(400);
            });
        });
    });
    describe("test pagination", () => {
        describe("test page", () => {
            test<LocalTestContext>("If page is 1 return the first page of results", async (context) => {
                const allCourses = await context.courseFactory.create(10, {language: await context.languageFactory.createOne()});
                allCourses.sort(defaultSortComparator);
                const recordsCount = allCourses.length;
                const page = 1, pageSize = 3;
                const expectedCourses = allCourses.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: courseSerializer.serializeList(expectedCourses)
                });
            });
            test<LocalTestContext>("If page is 2 return the second page of results", async (context) => {
                const allCourses = await context.courseFactory.create(10, {language: await context.languageFactory.createOne()});
                allCourses.sort(defaultSortComparator);
                const recordsCount = allCourses.length;
                const page = 2, pageSize = 3;
                const expectedCourses = allCourses.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: courseSerializer.serializeList(expectedCourses)
                });
            });
            test<LocalTestContext>("If page is last return the last page of results", async (context) => {
                const allCourses = await context.courseFactory.create(10, {language: await context.languageFactory.createOne()});
                allCourses.sort(defaultSortComparator);
                const recordsCount = allCourses.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedCourses = allCourses.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: courseSerializer.serializeList(expectedCourses)
                });
            });
            test<LocalTestContext>("If page is more than last return empty page", async (context) => {
                const allCourses = await context.courseFactory.create(10, {language: await context.languageFactory.createOne()});
                const recordsCount = allCourses.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize) + 1;
                const expectedCourses = allCourses.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

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
                const allCourses = await context.courseFactory.create(50, {language});
                allCourses.sort(defaultSortComparator);
                const recordsCount = allCourses.length;
                const page = 2, pageSize = 20;
                const expectedCourses = allCourses.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: courseSerializer.serializeList(expectedCourses)
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

    test<LocalTestContext>("If logged in return courses with vocab levels for user", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const expectedCourses = await context.courseFactory.create(5, {language, isPublic: true});
        await context.courseFactory.create(5, {language, isPublic: false});
        expectedCourses.sort(defaultSortComparator);
        await context.courseRepo.annotateVocabsByLevel(expectedCourses, user.id);
        const recordsCount = expectedCourses.length;

        const response = await makeRequest({}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: courseSerializer.serializeList(expectedCourses)
        });
    });
    test<LocalTestContext>("If logged in as author of courses return private courses", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const expectedCourses = [
            ...await context.courseFactory.create(5, {language, isPublic: true}),
            ...await context.courseFactory.create(5, {language, isPublic: false, addedBy: user.profile}),
        ];
        await context.courseFactory.create(5, {language, isPublic: false});
        expectedCourses.sort(defaultSortComparator);
        await context.courseRepo.annotateVocabsByLevel(expectedCourses, user.id);
        const recordsCount = expectedCourses.length;

        const response = await makeRequest({}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: courseSerializer.serializeList(expectedCourses)
        });
    });

});

/**{@link CourseController#createCourse}*/
describe("POST courses/", function () {
    const makeRequest = async ({data, files = {}}: {
        data: object;
        files?: {
            [key: string]: {
                value: "";
            } | {
                value: Buffer;
                fileName?: string,
                mimeType?: string
            }
        };
    }, authToken?: string) => {
        return await fetchWithFiles({
            options: {
                method: "POST",
                url: "courses/",
                body: {
                    data: data,
                    files: files
                },
            },
            authToken: authToken
        });
    };
    const imagePathRegex = new RegExp(`^${escapeRegExp(`${TEMP_ROOT_FILE_UPLOAD_DIR}/courses/images/`)}.*-.*\.(png|jpg|jpeg)$`);
    describe("If all fields are valid a new course should be created and return 201", () => {
        test<LocalTestContext>("If optional fields are missing use default values", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();

            const newCourse = context.courseFactory.makeOne({
                description: "",
                isPublic: true,
                lessons: [],
                addedBy: user.profile,
                language: language,
                image: "",
                vocabsByLevel: defaultVocabsByLevel()
            });

            const response = await makeRequest({
                data: {
                    title: newCourse.title,
                    languageCode: language.code,
                },
            }, session.token);

            const responseBody = response.json();
            expect(response.statusCode).to.equal(201);
            expect(responseBody).toMatchObject(courseSerializer.serialize(newCourse));

            const dbRecord = await context.courseRepo.findOne({title: newCourse.title, language}, {populate: ["lessons"]});
            expect(dbRecord).not.toBeNull();
            await context.courseRepo.annotateVocabsByLevel([dbRecord!], user.profile.id);
            expect(courseSerializer.serialize(dbRecord!)).toMatchObject(courseSerializer.serialize(newCourse));
        });
        test<LocalTestContext>("If optional fields are provided use provided values", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();

            const imageFileName = "lorem-ipsum-69_8KB-1_1ratio.png";
            const newCourse = context.courseFactory.makeOne({
                addedBy: user.profile,
                language: language,
                lessons: [],
                image: `${TEMP_ROOT_FILE_UPLOAD_DIR}/courses/images/${imageFileName}`,
                vocabsByLevel: defaultVocabsByLevel()
            });
            const response = await makeRequest({
                data: {
                    title: newCourse.title,
                    description: newCourse.description,
                    languageCode: language.code,
                    isPublic: newCourse.isPublic,
                },
                files: {image: readSampleFile(`images/${imageFileName}`)}
            }, session.token);

            const responseBody = response.json();
            expect(response.statusCode).to.equal(201);
            expect(responseBody).toEqual(expect.objectContaining(courseSerializer.serialize(newCourse, {ignore: ["image"]})));
            expect(fs.existsSync(responseBody.image)).toBeTruthy();

            const dbRecord = await context.courseRepo.findOne({title: newCourse.title, language}, {populate: ["lessons"]});
            expect(dbRecord).not.toBeNull();
            await context.courseRepo.annotateVocabsByLevel([dbRecord!], user.profile.id);
            expect(dbRecord!.image).toEqual(expect.stringMatching(imagePathRegex));
        });
    });
    test<LocalTestContext>("If user not logged in return 401", async (context) => {
        const language = await context.languageFactory.createOne();
        const newCourse = context.courseFactory.makeOne({language: language});

        const response = await makeRequest({
            data: {
                title: newCourse.title,
                languageCode: language.code,
            }
        });

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const newCourse = context.courseFactory.makeOne({language: language});

        const response = await makeRequest({
            data: {
                title: newCourse.title,
                languageCode: language.code,
            }
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
    describe("If required fields are missing return 400", async () => {
        test<LocalTestContext>("If title is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();

            const response = await makeRequest({
                data: {languageCode: language.code}
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If language is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});

            const newCourse = context.courseFactory.makeOne();
            const response = await makeRequest({
                data: {title: newCourse.title}
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 4xx code", async () => {
        test<LocalTestContext>("If title is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();

            const response = await makeRequest({
                data: {
                    title: faker.random.alpha(300),
                    languageCode: language.code,
                }
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        describe("If language is invalid return 400", () => {
            test<LocalTestContext>("If languageCode is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newCourse = context.courseFactory.makeOne({language: language});

                const response = await makeRequest({
                    data: {
                        title: newCourse.title,
                        languageCode: faker.random.alphaNumeric(10),
                    }
                }, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If language is not found return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newCourse = context.courseFactory.makeOne({language: language});

                const response = await makeRequest({
                    data: {
                        title: newCourse.title,
                        languageCode: faker.random.alpha(4),
                    }
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If language is not supported return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne({isSupported: false});
                const newCourse = context.courseFactory.makeOne({language: language});

                const response = await makeRequest({
                    data: {
                        title: newCourse.title,
                        languageCode: language.code,
                    }
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
        test<LocalTestContext>("If description is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newCourse = context.courseFactory.makeOne({language: language});

            const response = await makeRequest({
                data: {
                    title: newCourse.title,
                    languageCode: language.code,
                    description: faker.random.alpha(600)
                }
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If isPublic is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newCourse = context.courseFactory.makeOne({language: language});

            const response = await makeRequest({
                data: {
                    title: newCourse.title,
                    languageCode: language.code,
                    isPublic: "kinda?"
                }
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        describe("If image is invalid return 4xx", () => {
            test<LocalTestContext>("If image is not a jpeg or png return 415", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newCourse = context.courseFactory.makeOne({language: language});

                const response = await makeRequest({
                    data: {
                        title: newCourse.title,
                        languageCode: language.code,
                    },
                    files: {
                        image: readSampleFile("images/audio-468_4KB.png")
                    }
                }, session.token);
                expect(response.statusCode).to.equal(415);
            });
            test<LocalTestContext>("If the image file is more than 500KB return 413", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newCourse = context.courseFactory.makeOne({language: language});
                vi.spyOn(fileValidatorExports, "validateFileFields").mockImplementation(mockValidateFileFields({"image": 510 * 1024}));

                const response = await makeRequest({
                    data: {
                        title: newCourse.title,
                        languageCode: language.code,
                    },
                    files: {image: readSampleFile("images/lorem-ipsum-69_8KB-1_1ratio.png")}
                }, session.token);

                expect(response.statusCode).to.equal(413);
            });
            test<LocalTestContext>("If the image is not square return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newCourse = context.courseFactory.makeOne({language: language});

                const response = await makeRequest({
                    data: {
                        title: newCourse.title,
                        languageCode: language.code,
                    },
                    files: {
                        image: readSampleFile("images/rectangle-5_2KB-2_1ratio.png")
                    }
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            // test<LocalTestContext>("If image is corrupted return 415", async (context) => {});
        });
    });
});

/**{@link CourseController#getCourse}*/
describe("GET courses/:courseId/", function () {
    const makeRequest = async (courseId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `courses/${courseId}/`,
        };
        return await fetchRequest(options, authToken);
    };

    describe("If the course exists and is public return the course", () => {
        test<LocalTestContext>("If the user is not logged in return course and lessons without vocab levels", async (context) => {
            const course = await context.courseFactory.createOne({isPublic: true, language: await context.languageFactory.createOne()});

            const response = await makeRequest(course.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serialize(course));
        });
        test<LocalTestContext>("If the user is logged in return course and lessons with vocab levels", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const course = await context.courseFactory.createOne({isPublic: true, language: await context.languageFactory.createOne()});
            await context.courseRepo.annotateVocabsByLevel([course], user.id);

            const response = await makeRequest(course.id, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serialize(course));
        });
    });
    test<LocalTestContext>("If the course does not exist return 404", async () => {
        const response = await makeRequest(faker.datatype.number({min: 10000000}));
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If course id is invalid return 400", async () => {
        const response = await makeRequest(faker.random.alpha(8));
        expect(response.statusCode).to.equal(400);
    });
    test<LocalTestContext>("If the course is not public and the user is not logged in return 404", async (context) => {
        const course = await context.courseFactory.createOne({isPublic: false, language: await context.languageFactory.createOne()});

        const response = await makeRequest(course.id);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If the course is not public and the user is logged in as a non-author return 404", async (context) => {
        const author = await context.userFactory.createOne();
        const course = await context.courseFactory.createOne({
            isPublic: false,
            addedBy: author.profile,
            language: await context.languageFactory.createOne()
        });
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: otherUser});

        const response = await makeRequest(course.id, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If the course is not public and the user is logged in as author return course with vocabs by level", async (context) => {
        const author = await context.userFactory.createOne();
        const course = await context.courseFactory.createOne({
            isPublic: false,
            addedBy: author.profile,
            language: await context.languageFactory.createOne(),
            lessons: context.lessonFactory.makeDefinitions(3)
        });
        await context.courseRepo.annotateVocabsByLevel([course], author.id);
        await context.lessonRepo.annotateVocabsByLevel(course.lessons.getItems(), author.id);
        const session = await context.sessionFactory.createOne({user: author});

        const response = await makeRequest(course.id, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(courseSerializer.serialize(course));
    });
});

/**{@link CourseController#updateCourse}*/
describe("PUT courses/:courseId/", function () {
    const makeRequest = async (courseId: number | string, {data, files = {}}: {
        data?: object;
        files?: {
            [key: string]: {
                value: "";
            } | {
                value: Buffer;
                fileName?: string,
                mimeType?: string
            }
        };
    }, authToken?: string) => {
        return await fetchWithFiles({
            options: {
                method: "PUT",
                url: `courses/${courseId}/`,
                body: {
                    data: data,
                    files: files
                },
            },
            authToken: authToken
        });
    };

    describe("If the course exists, user is logged in as author and all fields are valid, update course and return 200", async () => {
        test<LocalTestContext>("If new image is not provided, keep old image", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            let course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});

            let lessonCounter = 0;
            let courseLessons = await context.lessonFactory.each(l => {
                l.orderInCourse = lessonCounter;
                lessonCounter++;
            }).create(10, {course: course});
            const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});
            const shuffledLessonIds = shuffleArray(courseLessons).map(l => l.id);

            const response = await makeRequest(course.id, {
                data: {
                    title: updatedCourse.title,
                    description: updatedCourse.description,
                    isPublic: updatedCourse.isPublic,
                    lessonsOrder: shuffledLessonIds
                }
            }, session.token);
            context.em.clear();
            course = await context.courseRepo.findOneOrFail({id: course.id}, {populate: ["language", "addedBy", "addedBy.user", "addedBy.languagesLearning"]});
            await context.em.populate(course, ["lessons"], {orderBy: {lessons: {orderInCourse: "asc"}}});
            await context.courseRepo.annotateVocabsByLevel([course], author.id);
            await context.lessonRepo.annotateVocabsByLevel(course.lessons.getItems(), author.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serialize(course));
            expect(response.json().lessons.map((l: LessonSchema) => l.id)).toEqual(shuffledLessonIds);
            const updatedFields: (keyof CourseSchema)[] = ["title", "description", "isPublic"];
            expect(courseSerializer.serialize(course, {include: updatedFields})).toEqual(courseSerializer.serialize(updatedCourse, {include: updatedFields}));
        });
        test<LocalTestContext>("If new image is blank clear course image", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            let course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});

            let lessonCounter = 0;
            let courseLessons = await context.lessonFactory.each(l => {
                l.orderInCourse = lessonCounter;
                lessonCounter++;
            }).create(10, {course: course});
            const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language, image: ""});
            const shuffledLessonIds = shuffleArray(courseLessons).map(l => l.id);

            const response = await makeRequest(course.id, {
                data: {
                    title: updatedCourse.title,
                    description: updatedCourse.description,
                    isPublic: updatedCourse.isPublic,
                    lessonsOrder: shuffledLessonIds
                },
                files: {image: {value: ""}}
            }, session.token);

            context.em.clear();
            course = await context.courseRepo.findOneOrFail({id: course.id}, {populate: ["language", "addedBy", "addedBy.user", "addedBy.languagesLearning"]});
            await context.em.populate(course, ["lessons"], {orderBy: {lessons: {orderInCourse: "asc"}}});
            await context.courseRepo.annotateVocabsByLevel([course], author.id);
            await context.lessonRepo.annotateVocabsByLevel(course.lessons.getItems(), author.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serialize(course));
            expect(course.image).toEqual("");
            expect(response.json().lessons.map((l: LessonSchema) => l.id)).toEqual(shuffledLessonIds);
            const updatedFields: (keyof CourseSchema)[] = ["title", "description", "isPublic", "image"];
            expect(courseSerializer.serialize(course, {include: updatedFields})).toEqual(courseSerializer.serialize(updatedCourse, {include: updatedFields}));
        });
        test<LocalTestContext>("If new image is provided, update course image", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            let course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: [], image: ""});

            let lessonCounter = 0;
            let courseLessons = await context.lessonFactory.each(l => {
                l.orderInCourse = lessonCounter;
                lessonCounter++;
            }).create(10, {course: course});
            const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});
            const shuffledLessonIds = shuffleArray(courseLessons).map(l => l.id);

            const response = await makeRequest(course.id, {
                data: {
                    title: updatedCourse.title,
                    description: updatedCourse.description,
                    isPublic: updatedCourse.isPublic,
                    lessonsOrder: shuffledLessonIds
                },
                files: {image: readSampleFile("images/lorem-ipsum-69_8KB-1_1ratio.png")}
            }, session.token);

            context.em.clear();
            course = await context.courseRepo.findOneOrFail({id: course.id}, {populate: ["language", "addedBy", "addedBy.user", "addedBy.languagesLearning"]});
            await context.em.populate(course, ["lessons"], {orderBy: {lessons: {orderInCourse: "asc"}}});
            await context.courseRepo.annotateVocabsByLevel([course], author.id);
            await context.lessonRepo.annotateVocabsByLevel(course.lessons.getItems(), author.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serialize(course));
            expect(fs.existsSync(course.image)).toBeTruthy();
            expect(response.json().lessons.map((l: LessonSchema) => l.id)).toEqual(shuffledLessonIds);
            const updatedFields: (keyof CourseSchema)[] = ["title", "description", "isPublic"];
            expect(courseSerializer.serialize(course, {include: updatedFields})).toEqual(courseSerializer.serialize(updatedCourse, {include: updatedFields}));
        });
    });
    test<LocalTestContext>("If user not logged in return 401", async (context) => {
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: [], image: ""});

        let lessonCounter = 0;
        let courseLessons = await context.lessonFactory.each(l => {
            l.orderInCourse = lessonCounter;
            lessonCounter++;
        }).create(10, {course: course});
        const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});

        const response = await makeRequest(course.id, {
            data: {
                title: updatedCourse.title,
                description: updatedCourse.description,
                isPublic: updatedCourse.isPublic,
                lessonsOrder: shuffleArray(courseLessons).map(l => l.id)
            }
        });

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: [], image: ""});

        let lessonCounter = 0;
        let courseLessons = await context.lessonFactory.each(l => {
            l.orderInCourse = lessonCounter;
            lessonCounter++;
        }).create(10, {course: course});
        const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});

        const response = await makeRequest(course.id, {
            data: {
                title: updatedCourse.title,
                description: updatedCourse.description,
                isPublic: updatedCourse.isPublic,
                lessonsOrder: shuffleArray(courseLessons).map(l => l.id)
            }
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
    test<LocalTestContext>("If course does not exist return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const updatedCourse = await context.courseFactory.makeOne({language: language});

        const response = await makeRequest(faker.random.numeric(20), {
            data: {
                title: updatedCourse.title,
                description: updatedCourse.description,
                isPublic: updatedCourse.isPublic,
                lessonsOrder: [1, 2, 3]
            }
        }, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If course is not public and user is not author return 404", async (context) => {
        const author = await context.userFactory.createOne();
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: otherUser});
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({
            addedBy: author.profile,
            isPublic: false,
            language: language,
            lessons: [],
            image: ""
        });

        let lessonCounter = 0;
        let courseLessons = await context.lessonFactory.each(l => {
            l.orderInCourse = lessonCounter;
            lessonCounter++;
        }).create(10, {course: course});
        const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});

        const response = await makeRequest(course.id, {
            data: {
                title: updatedCourse.title,
                description: updatedCourse.description,
                isPublic: updatedCourse.isPublic,
                lessonsOrder: shuffleArray(courseLessons).map(l => l.id)
            }
        }, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If course is public but user is not author of course return 403", async (context) => {
        const author = await context.userFactory.createOne();
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: otherUser});
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({
            addedBy: author.profile,
            isPublic: true,
            language: language,
            lessons: [],
            image: ""
        });

        let lessonCounter = 0;
        let courseLessons = await context.lessonFactory.each(l => {
            l.orderInCourse = lessonCounter;
            lessonCounter++;
        }).create(10, {course: course});
        const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});

        const response = await makeRequest(course.id, {
            data: {
                title: updatedCourse.title,
                description: updatedCourse.description,
                isPublic: updatedCourse.isPublic,
                lessonsOrder: shuffleArray(courseLessons).map(l => l.id)
            }
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
    describe("If required fields are missing return 400", async () => {
        test<LocalTestContext>("If title is missing return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: [], image: ""});

            let lessonCounter = 0;
            let courseLessons = await context.lessonFactory.each(l => {
                l.orderInCourse = lessonCounter;
                lessonCounter++;
            }).create(10, {course: course});
            const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});

            const response = await makeRequest(course.id, {
                data: {
                    description: updatedCourse.description,
                    isPublic: updatedCourse.isPublic,
                    lessonsOrder: shuffleArray(courseLessons).map(l => l.id)
                }
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If description is missing return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: [], image: ""});

            let lessonCounter = 0;
            let courseLessons = await context.lessonFactory.each(l => {
                l.orderInCourse = lessonCounter;
                lessonCounter++;
            }).create(10, {course: course});
            const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});

            const response = await makeRequest(course.id, {
                data: {
                    title: updatedCourse.title,
                    isPublic: updatedCourse.isPublic,
                    lessonsOrder: shuffleArray(courseLessons).map(l => l.id)
                }
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If isPublic is missing return 400", async (context) => {

            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: [], image: ""});

            let lessonCounter = 0;
            let courseLessons = await context.lessonFactory.each(l => {
                l.orderInCourse = lessonCounter;
                lessonCounter++;
            }).create(10, {course: course});
            const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});

            const response = await makeRequest(course.id, {
                data: {
                    title: updatedCourse.title,
                    description: updatedCourse.description,
                    lessonsOrder: shuffleArray(courseLessons).map(l => l.id)
                }
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If lessonsOrder is missing return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: [], image: ""});

            let lessonCounter = 0;
            await context.lessonFactory.each(l => {
                l.orderInCourse = lessonCounter;
                lessonCounter++;
            }).create(10, {course: course});
            const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});

            const response = await makeRequest(course.id, {
                data: {
                    title: updatedCourse.title,
                    description: updatedCourse.description,
                    isPublic: updatedCourse.isPublic,
                }
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });

        test<LocalTestContext>("If data is missing return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: [], image: ""});

            let lessonCounter = 0;
            await context.lessonFactory.each(l => {
                l.orderInCourse = lessonCounter;
                lessonCounter++;
            }).create(10, {course: course});

            const response = await makeRequest(course.id, {
                files: {
                    image: readSampleFile("images/lorem-ipsum-69_8KB-1_1ratio.png")
                }
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 4xx", async () => {
        test<LocalTestContext>("If title is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: [], image: ""});

            let lessonCounter = 0;
            let courseLessons = await context.lessonFactory.each(l => {
                l.orderInCourse = lessonCounter;
                lessonCounter++;
            }).create(10, {course: course});
            const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});

            const response = await makeRequest(course.id, {
                data: {
                    title: faker.random.alpha(300),
                    description: updatedCourse.description,
                    isPublic: updatedCourse.isPublic,
                    lessonsOrder: shuffleArray(courseLessons).map(l => l.id)
                }
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If description is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: [], image: ""});

            let lessonCounter = 0;
            let courseLessons = await context.lessonFactory.each(l => {
                l.orderInCourse = lessonCounter;
                lessonCounter++;
            }).create(10, {course: course});
            const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});

            const response = await makeRequest(course.id, {
                data: {
                    title: updatedCourse.title,
                    description: faker.random.alpha(600),
                    isPublic: updatedCourse.isPublic,
                    lessonsOrder: shuffleArray(courseLessons).map(l => l.id)
                }
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If isPublic is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: [], image: ""});

            let lessonCounter = 0;
            let courseLessons = await context.lessonFactory.each(l => {
                l.orderInCourse = lessonCounter;
                lessonCounter++;
            }).create(10, {course: course});
            const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});

            const response = await makeRequest(course.id, {
                data: {
                    title: updatedCourse.title,
                    description: updatedCourse.description,
                    isPublic: "kinda?",
                    lessonsOrder: shuffleArray(courseLessons).map(l => l.id)
                }
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        describe("If lessonsOrder is invalid return 400", async () => {
            test<LocalTestContext>("If lessonsOrder is not an array of integers return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: [], image: ""});
                const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});

                const response = await makeRequest(course.id, {
                    data: {
                        title: updatedCourse.title,
                        description: updatedCourse.description,
                        isPublic: updatedCourse.isPublic,
                        lessonsOrder: [1, 2, 3.5, -1, "42"]
                    }
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            describe("If lessonsOrder is not a permutation of course lesson ids return 400", () => {
                test<LocalTestContext>("If lessonsOrder has any new lesson ids return 400", async (context) => {
                    const author = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: author});
                    const language = await context.languageFactory.createOne();
                    const course = await context.courseFactory.createOne({
                        addedBy: author.profile,
                        language: language,
                        lessons: [],
                        image: ""
                    });
                    let lessonCounter = 0;
                    let courseLessons = await context.lessonFactory.each(l => {
                        l.orderInCourse = lessonCounter;
                        lessonCounter++;
                    }).create(10, {course: course});
                    const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});
                    const otherLesson = await context.lessonFactory.createOne({course: await context.courseFactory.createOne({language: language})});

                    const response = await makeRequest(course.id, {
                        data: {
                            title: updatedCourse.title,
                            description: updatedCourse.description,
                            isPublic: updatedCourse.isPublic,
                            lessonsOrder: [...shuffleArray(courseLessons.map(l => l.id)), otherLesson.id]
                        }
                    }, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If lessonsOrder is missing lesson ids return 400", async (context) => {
                    const author = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: author});
                    const language = await context.languageFactory.createOne();
                    const course = await context.courseFactory.createOne({
                        addedBy: author.profile,
                        language: language,
                        lessons: [],
                        image: ""
                    });
                    let lessonCounter = 0;
                    let courseLessons = await context.lessonFactory.each(l => {
                        l.orderInCourse = lessonCounter;
                        lessonCounter++;
                    }).create(10, {course: course});
                    const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});
                    const lessonOrder = shuffleArray(courseLessons).map(l => l.id);
                    lessonOrder.splice(faker.datatype.number({max: courseLessons.length - 1}),
                        faker.datatype.number({min: 1, max: courseLessons.length}));

                    const response = await makeRequest(course.id, {
                        data: {
                            title: updatedCourse.title,
                            description: updatedCourse.description,
                            isPublic: updatedCourse.isPublic,
                            lessonsOrder: lessonOrder
                        }
                    }, session.token);

                    expect(response.statusCode).to.equal(400);
                });

                test<LocalTestContext>("If lessonsOrder has any repeated ids return 400", async (context) => {
                    const author = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: author});
                    const language = await context.languageFactory.createOne();
                    const course = await context.courseFactory.createOne({
                        addedBy: author.profile,
                        language: language,
                        lessons: [],
                        image: ""
                    });
                    let lessonCounter = 0;
                    let courseLessons = await context.lessonFactory.each(l => {
                        l.orderInCourse = lessonCounter;
                        lessonCounter++;
                    }).create(10, {course: course});
                    const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});
                    const lessonOrder = shuffleArray(courseLessons).map(l => l.id);
                    lessonOrder.splice(faker.datatype.number({max: courseLessons.length - 1}), 0, lessonOrder[faker.datatype.number({max: courseLessons.length - 1})]);

                    const response = await makeRequest(course.id, {
                        data: {
                            title: updatedCourse.title,
                            description: updatedCourse.description,
                            isPublic: updatedCourse.isPublic,
                            lessonsOrder: lessonOrder
                        }
                    }, session.token);

                    expect(response.statusCode).to.equal(400);
                });
            });
        });

        describe("If image is invalid return 4xx", () => {
            test<LocalTestContext>("If image is not a jpeg or png return 415", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: [], image: ""});

                let lessonCounter = 0;
                let courseLessons = await context.lessonFactory.each(l => {
                    l.orderInCourse = lessonCounter;
                    lessonCounter++;
                }).create(10, {course: course});
                const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});

                const response = await makeRequest(course.id, {
                    data: {
                        title: faker.random.alpha(300),
                        description: updatedCourse.description,
                        isPublic: updatedCourse.isPublic,
                        lessonsOrder: shuffleArray(courseLessons).map(l => l.id)
                    },
                    files: {image: readSampleFile("images/audio-468_4KB.png")}
                }, session.token);

                expect(response.statusCode).to.equal(415);
            });
            test<LocalTestContext>("If the image file is more than 500KB return 413", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: [], image: ""});

                let lessonCounter = 0;
                let courseLessons = await context.lessonFactory.each(l => {
                    l.orderInCourse = lessonCounter;
                    lessonCounter++;
                }).create(10, {course: course});
                const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});
                const spy = vi.spyOn(fileValidatorExports, "validateFileFields").mockImplementation(mockValidateFileFields({"image": 510 * 1024}));

                const response = await makeRequest(course.id, {
                    data: {
                        title: faker.random.alpha(300),
                        description: updatedCourse.description,
                        isPublic: updatedCourse.isPublic,
                        lessonsOrder: shuffleArray(courseLessons).map(l => l.id)
                    },
                    files: {
                        image: readSampleFile("images/lorem-ipsum-69_8KB-1_1ratio.png")
                    }
                }, session.token);
                expect(response.statusCode).to.equal(413);
            });
            test<LocalTestContext>("If the image is not square return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: [], image: ""});

                let lessonCounter = 0;
                let courseLessons = await context.lessonFactory.each(l => {
                    l.orderInCourse = lessonCounter;
                    lessonCounter++;
                }).create(10, {course: course});
                const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});

                const response = await makeRequest(course.id, {
                    data: {
                        title: faker.random.alpha(300),
                        description: updatedCourse.description,
                        isPublic: updatedCourse.isPublic,
                        lessonsOrder: shuffleArray(courseLessons).map(l => l.id)
                    },
                    files: {image: readSampleFile("images/rectangle-5_2KB-2_1ratio.png")}
                }, session.token);
                expect(response.statusCode).to.equal(400);
            });
            // test<LocalTestContext>("If image is corrupted return 415", async (context) => {});
        });
    });
});

/**{@link CourseController#getUserBookmarkedCourses}*/
describe("GET users/me/courses/bookmarked/", function () {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/me/courses/bookmarked/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const queryDefaults = {pagination: {pageSize: 10, page: 1}};
    const defaultSortComparator = createComparator(Course, [
        {property: "title", order: "asc"},
        {property: "id", order: "asc"}]
    );
    test<LocalTestContext>("If there are no filters return all courses user has bookmarked", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const language = await context.languageFactory.createOne();
        const expectedCourses = await context.courseFactory.create(3, {language, bookmarkers: user.profile});
        await context.courseFactory.create(3, {language});
        await context.courseRepo.annotateVocabsByLevel(expectedCourses, user.profile.id)
        expectedCourses.sort(defaultSortComparator);
        const recordsCount = expectedCourses.length;

        const response = await makeRequest({}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: courseSerializer.serializeList(expectedCourses)
        });
    });
    describe("test languageCode filter", () => {
        test<LocalTestContext>("If language filter is valid and language exists only return courses in that language that user has bookmarked", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            const expectedCourses = await context.courseFactory.create(3, {language: language1, bookmarkers: user.profile});
            await context.courseFactory.create(3, {language: language2, bookmarkers: user.profile});
            await context.courseFactory.create(3, {language: language1});
            await context.courseRepo.annotateVocabsByLevel(expectedCourses, user.profile.id)
            expectedCourses.sort(defaultSortComparator);
            const recordsCount = expectedCourses.length;

            const response = await makeRequest({languageCode: language1.code}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: courseSerializer.serializeList(expectedCourses)
            });
        });
        test<LocalTestContext>("If language does not exist return empty course list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            await context.courseFactory.create(3, {language: await context.languageFactory.createOne(), bookmarkers: user.profile});

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
            const session = await context.sessionFactory.createOne({user});
            const response = await makeRequest({languageCode: 12345}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test addedBy filter", () => {
        test<LocalTestContext>("If addedBy filter is valid and user exists only return courses added by that user that current user has bookmarked", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();

            const user1 = await context.userFactory.createOne();
            const user2 = await context.userFactory.createOne();
            const expectedCourses = await context.courseFactory.create(3, {language, addedBy: user1.profile, bookmarkers: user.profile});
            await context.courseFactory.create(3, {language, addedBy: user2.profile, bookmarkers: user.profile});
            await context.courseFactory.create(3, {language, addedBy: user1.profile});
            await context.courseRepo.annotateVocabsByLevel(expectedCourses, user.profile.id)
            expectedCourses.sort(defaultSortComparator);
            const recordsCount = expectedCourses.length;

            const response = await makeRequest({addedBy: user1.username}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: courseSerializer.serializeList(expectedCourses)
            });
        });
        test<LocalTestContext>("If addedBy is me and signed in return courses added by current user that they have bookmarked", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();

            const otherUser = await context.userFactory.createOne();
            const expectedCourses = await context.courseFactory.create(3, {language, addedBy: user.profile, bookmarkers: user.profile});
            await context.courseFactory.create(3, {language, addedBy: otherUser.profile, bookmarkers: user.profile});
            await context.courseFactory.create(3, {language, addedBy: user.profile});
            await context.courseRepo.annotateVocabsByLevel(expectedCourses, user.profile.id)
            expectedCourses.sort(defaultSortComparator);
            const recordsCount = expectedCourses.length;

            const response = await makeRequest({addedBy: "me"}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: courseSerializer.serializeList(expectedCourses)
            });
        });
        test<LocalTestContext>("If user does not exist return empty course list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            await context.courseFactory.create(3, {language: await context.languageFactory.createOne(), bookmarkers: user.profile});

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
        test<LocalTestContext>("If searchQuery is valid return courses with query in title or description", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();
            const searchQuery = "search query";
            const expectedCourses = [
                await context.courseFactory.createOne({
                    language,
                    bookmarkers: user.profile,
                    title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`
                }),
                await context.courseFactory.createOne({
                    language,
                    bookmarkers: user.profile,
                    description: `description ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`
                })
            ];
            await context.courseFactory.create(3, {language: language, title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`});
            await context.courseFactory.create(3, {
                language: language,
                description: `description ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`
            });
            await context.courseRepo.annotateVocabsByLevel(expectedCourses, user.profile.id)
            expectedCourses.sort(defaultSortComparator);
            const recordsCount = expectedCourses.length;

            const response = await makeRequest({searchQuery: searchQuery}, session.token);
            expect(response.statusCode).to.equal(200);

            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: courseSerializer.serializeList(expectedCourses)
            });
        });
        test<LocalTestContext>("If searchQuery is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})}, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If no courses match search query return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            await context.courseFactory.create(3, {language: await context.languageFactory.createOne(), bookmarkers: user.profile});

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
            test<LocalTestContext>("test sortBy title", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedCourses = [
                    await context.courseFactory.createOne({title: "abc", bookmarkers: user.profile, language}),
                    await context.courseFactory.createOne({title: "def", bookmarkers: user.profile, language})
                ];
                await context.courseRepo.annotateVocabsByLevel(expectedCourses, user.profile.id)
                const recordsCount = expectedCourses.length;

                const response = await makeRequest({sortBy: "title"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: courseSerializer.serializeList(expectedCourses)
                });
            });
            test<LocalTestContext>("test sortBy createdDate", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedCourses = [
                    await context.courseFactory.createOne({addedOn: new Date("2018-07-22T10:30:45.000Z"), bookmarkers: user.profile, language}),
                    await context.courseFactory.createOne({addedOn: new Date("2023-03-15T20:29:42.000Z"), bookmarkers: user.profile, language}),
                ];
                await context.courseRepo.annotateVocabsByLevel(expectedCourses, user.profile.id)
                const recordsCount = expectedCourses.length;

                const response = await makeRequest({sortBy: "createdDate"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: courseSerializer.serializeList(expectedCourses)
                });
            });
            test<LocalTestContext>("test sortBy avgPastViewersCountPerLesson", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();

                const language = await context.languageFactory.createOne();
                const expectedCourses = [
                    await context.courseFactory.createOne({language, bookmarkers: user.profile, lessons: []}),
                    await context.courseFactory.createOne({
                        language,
                        bookmarkers: user.profile,
                        lessons: [context.lessonFactory.makeOne({pastViewers: []})]
                    }),
                    await context.courseFactory.createOne({
                        language,
                        bookmarkers: user.profile,
                        lessons: [context.lessonFactory.makeOne({pastViewers: [user1.profile]})]
                    }),
                    await context.courseFactory.createOne({
                        language,
                        bookmarkers: user.profile,
                        lessons: [context.lessonFactory.makeOne({pastViewers: [user1.profile, user2.profile]})]
                    }),
                ];
                await context.courseRepo.annotateVocabsByLevel(expectedCourses, user.profile.id)
                const recordsCount = expectedCourses.length;

                const response = await makeRequest({sortBy: "avgPastViewersCountPerLesson"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: courseSerializer.serializeList(expectedCourses)
                });
            });
            test<LocalTestContext>("if sortBy is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const response = await makeRequest({sortBy: "lessons"}, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<LocalTestContext>("test sortOrder ascending", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedCourses = [
                    await context.courseFactory.createOne({title: "abc", bookmarkers: user.profile, language}),
                    await context.courseFactory.createOne({title: "def", bookmarkers: user.profile, language})
                ];
                await context.courseRepo.annotateVocabsByLevel(expectedCourses, user.profile.id)
                const recordsCount = expectedCourses.length;

                const response = await makeRequest({sortOrder: "asc"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: courseSerializer.serializeList(expectedCourses)
                });
            });
            test<LocalTestContext>("test sortOrder descending", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedCourses = [
                    await context.courseFactory.createOne({title: "def", bookmarkers: user.profile, language}),
                    await context.courseFactory.createOne({title: "abc", bookmarkers: user.profile, language}),
                ];
                await context.courseRepo.annotateVocabsByLevel(expectedCourses, user.profile.id)
                const recordsCount = expectedCourses.length;

                const response = await makeRequest({sortOrder: "desc"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: courseSerializer.serializeList(expectedCourses)
                });
            });
            test<LocalTestContext>("if sortBy is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const response = await makeRequest({sortOrder: "rising"}, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
    });
    describe("test pagination", () => {
        describe("test page", () => {
            test<LocalTestContext>("If page is 1 return the first page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allCourses = await context.courseFactory.create(10, {language, bookmarkers: user.profile});
                allCourses.sort(defaultSortComparator);
                const recordsCount = allCourses.length;
                const page = 1, pageSize = 3;
                const expectedCourses = allCourses.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.courseRepo.annotateVocabsByLevel(expectedCourses, user.profile.id)

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: courseSerializer.serializeList(expectedCourses)
                });
            });
            test<LocalTestContext>("If page is 2 return the second page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allCourses = await context.courseFactory.create(10, {language, bookmarkers: user.profile});
                allCourses.sort(defaultSortComparator);
                const recordsCount = allCourses.length;
                const page = 2, pageSize = 3;
                const expectedCourses = allCourses.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.courseRepo.annotateVocabsByLevel(expectedCourses, user.profile.id)

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: courseSerializer.serializeList(expectedCourses)
                });
            });
            test<LocalTestContext>("If page is last return the last page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allCourses = await context.courseFactory.create(10, {language, bookmarkers: user.profile});
                allCourses.sort(defaultSortComparator);
                const recordsCount = allCourses.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedCourses = allCourses.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.courseRepo.annotateVocabsByLevel(expectedCourses, user.profile.id)

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: courseSerializer.serializeList(expectedCourses)
                });
            });
            test<LocalTestContext>("If page is more than last return empty page", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allCourses = await context.courseFactory.create(10, {language, bookmarkers: user.profile});
                const recordsCount = allCourses.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize) + 1;
                const expectedCourses = allCourses.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.courseRepo.annotateVocabsByLevel(expectedCourses, user.profile.id)

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
                    const session = await context.sessionFactory.createOne({user});
                    const response = await makeRequest({page: 0, pageSize: 3}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If page is not a number return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user});
                    const response = await makeRequest({page: "last", pageSize: 3}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
            });
        });
        describe("test pageSize", () => {
            test<LocalTestContext>("If pageSize is 20 split the results into 20 sized pages", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allCourses = await context.courseFactory.create(50, {language, bookmarkers: user.profile});
                allCourses.sort(defaultSortComparator);
                const recordsCount = allCourses.length;
                const page = 2, pageSize = 20;
                const expectedCourses = allCourses.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.courseRepo.annotateVocabsByLevel(expectedCourses, user.profile.id)

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: courseSerializer.serializeList(expectedCourses)
                });
                expect(response.json().data.length).toBeLessThanOrEqual(pageSize);
            });
            describe("If pageSize is invalid return 400", () => {
                test<LocalTestContext>("If pageSize is too big return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user});
                    const response = await makeRequest({page: 1, pageSize: 250}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If pageSize is negative return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user});
                    const response = await makeRequest({page: 1, pageSize: -20}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If pageSize is not a number return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user});
                    const response = await makeRequest({page: 1, pageSize: "a lot"}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
            });
        });
    });
});
