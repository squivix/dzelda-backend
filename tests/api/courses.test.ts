import {beforeEach, describe, expect, test, TestContext} from "vitest";
import {orm} from "@/src/server.js";
import {buildQueryString, fetchRequest, fetchWithFiles, readSampleFile} from "@/tests/api/utils.js";
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
import {MapLearnerLesson} from "@/src/models/entities/MapLearnerLesson.js";
import {courseSerializer} from "@/src/presentation/response/serializers/entities/CourseSerializer";
import {LessonSchema} from "@/src/presentation/response/interfaces/entities/LessonSchema";
import {CourseSchema} from "@/src/presentation/response/interfaces/entities/CourseSchema.js";

interface LocalTestContext extends TestContext {
    courseRepo: CourseRepo;
    lessonRepo: LessonRepo;
    languageFactory: LanguageFactory;
    courseFactory: CourseFactory;
    lessonFactory: LessonFactory;
}

beforeEach<LocalTestContext>((context) => {
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.profileFactory = new ProfileFactory(context.em);
    context.sessionFactory = new SessionFactory(context.em);
    context.courseFactory = new CourseFactory(context.em);
    context.lessonFactory = new LessonFactory(context.em);
    context.languageFactory = new LanguageFactory(context.em);
    context.lessonRepo = context.em.getRepository(Lesson) as LessonRepo;
    context.courseRepo = context.em.getRepository(Course) as CourseRepo;
});

/**@link CourseController#getCourses*/
describe("GET courses/", function () {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `courses/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };

    test<LocalTestContext>("If there are no filters return all public courses", async (context) => {
        await context.courseFactory.create(10, {language: await context.languageFactory.createOne()});

        const response = await makeRequest();
        const courses = await context.courseRepo.find({isPublic: true}, {populate: ["language", "addedBy.user"], orderBy: {title: "asc"}});
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(courseSerializer.serializeList(courses));
    });
    describe("test languageCode filter", () => {
        test<LocalTestContext>("If language filter is valid and language exists only return public courses in that language", async (context) => {
            const language1 = await context.languageFactory.createOne();
            await context.courseFactory.create(5, {language: language1});
            await context.courseFactory.create(5, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({languageCode: language1.code});
            const courses = await context.courseRepo.find({
                isPublic: true,
                language: language1
            }, {populate: ["addedBy.user"], orderBy: {title: "asc"}, refresh: true});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serializeList(courses));
        });
        test<LocalTestContext>("If language does not exist return empty course list", async (context) => {
            await context.courseFactory.create(10, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({languageCode: faker.random.alpha({count: 4})});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual([]);
        });
        test<LocalTestContext>("If language filter is invalid return 400", async (context) => {
            await context.courseFactory.create(10, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({languageCode: 12345});
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test addedBy filter", () => {
        test<LocalTestContext>("If addedBy filter is valid and user exists only return public courses added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            await context.courseFactory.create(5, {language: await context.languageFactory.createOne(), addedBy: user.profile});
            await context.courseFactory.create(5, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({addedBy: user.username});
            const courses = await context.courseRepo.find({
                isPublic: true,
                addedBy: user.profile
            }, {populate: ["addedBy.user"], orderBy: {title: "asc"}, refresh: true});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serializeList(courses));
        });
        test<LocalTestContext>("If addedBy is me and signed in return courses added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            await context.courseFactory.create(5, {language: await context.languageFactory.createOne(), addedBy: user.profile});
            await context.courseFactory.create(5, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({addedBy: "me"}, session.token);
            let courses = await context.courseRepo.find({
                addedBy: user.profile
            }, {populate: ["addedBy.user"], orderBy: {title: "asc"}, refresh: true});
            courses = await context.courseRepo.annotateVocabsByLevel(courses, user.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serializeList(courses));
        });
        test<LocalTestContext>("If addedBy is me and not signed in return 401", async (context) => {
            await context.courseFactory.create(10, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({addedBy: "me"});
            expect(response.statusCode).to.equal(401);
        });
        test<LocalTestContext>("If user does not exist return empty course list", async (context) => {
            await context.courseFactory.create(10, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({addedBy: faker.random.alpha({count: 20})});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual([]);
        });
        test<LocalTestContext>("If addedBy filter is invalid return 400", async (context) => {
            await context.courseFactory.create(10, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({addedBy: "!@#%#%^#^!"});
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test searchQuery filter", () => {
        test<LocalTestContext>("If searchQuery is valid return courses with query in title or description", async (context) => {
            const searchQuery = "search query";
            const language = await context.languageFactory.createOne();
            for (let i = 0; i < 10; i++) {
                if (i % 2 == 0)
                    await context.courseFactory.createOne({
                        language: language,
                        title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`
                    });
                else
                    await context.courseFactory.createOne({
                        language: language,
                        description: `description ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`
                    });
            }
            await context.courseFactory.create(5, {language: language,});

            const response = await makeRequest({searchQuery: searchQuery});

            const courses = await context.courseRepo.find({
                isPublic: true,
                $or: [{title: {$ilike: `%${searchQuery}%`}}, {description: {$ilike: `%${searchQuery}%`}}]
            }, {populate: ["addedBy.user", "language"], orderBy: {title: "asc"}});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serializeList(courses));
        });
        test<LocalTestContext>("If searchQuery is invalid return 400", async (context) => {
            await context.courseFactory.create(10, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})});

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If no courses match search query return empty list", async (context) => {
            await context.courseFactory.create(10, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({searchQuery: faker.random.alpha({count: 200})});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual([]);
        });
    });
    describe("test sort", () => {
        describe("test sortBy", () => {
            test<LocalTestContext>("test sortBy title", async (context) => {
                const language = await context.languageFactory.createOne();
                await context.courseFactory.createOne({title: "abc", language});
                await context.courseFactory.createOne({title: "def", language});

                const response = await makeRequest({sortBy: "title"});
                const courses = await context.courseRepo.find({isPublic: true}, {
                    populate: ["language", "addedBy.user"],
                    orderBy: {title: "asc"}
                });
                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(courseSerializer.serializeList(courses));
            });
            test<LocalTestContext>("test sortBy createdDate", async (context) => {
                const language = await context.languageFactory.createOne();
                await context.courseFactory.createOne({addedOn: "2023-03-15T20:29:42.765Z", language});
                await context.courseFactory.createOne({addedOn: "2018-07-22T10:30:45.000Z", language});

                const response = await makeRequest({sortBy: "createdDate"});
                const courses = await context.courseRepo.find({isPublic: true}, {
                    populate: ["language", "addedBy.user"],
                    orderBy: {addedOn: "asc"}
                });
                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(courseSerializer.serializeList(courses));
            });
            test<LocalTestContext>("test sortBy learnersCount", async (context) => {
                const user = await context.userFactory.createOne();
                const language = await context.languageFactory.createOne();
                await context.lessonFactory.create(3, {course: await context.courseFactory.createOne({language}), learners: user.profile});
                await context.courseFactory.createOne({language});

                const response = await makeRequest({sortBy: "learnersCount"});
                const courses = await context.courseRepo.find({isPublic: true}, {
                    populate: ["language", "addedBy.user"],
                    orderBy: {learnersCount: "asc"}
                });
                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(courseSerializer.serializeList(courses));
            });
            test<LocalTestContext>("if sortBy is invalid return 400", async (context) => {
                const response = await makeRequest({sortBy: "lessons"});
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<LocalTestContext>("test sortOrder ascending", async (context) => {
                const language = await context.languageFactory.createOne();
                await context.courseFactory.createOne({title: "abc", language});
                await context.courseFactory.createOne({title: "def", language});

                const response = await makeRequest({sortBy: "title", sortOrder: "asc"});
                const courses = await context.courseRepo.find({isPublic: true}, {
                    populate: ["language", "addedBy.user"],
                    orderBy: {title: "asc"}
                });
                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(courseSerializer.serializeList(courses));
            });
            test<LocalTestContext>("test sortOrder descending", async (context) => {
                const language = await context.languageFactory.createOne();
                await context.courseFactory.createOne({title: "abc", language});
                await context.courseFactory.createOne({title: "def", language});

                const response = await makeRequest({sortBy: "title", sortOrder: "desc"});
                const courses = await context.courseRepo.find({isPublic: true}, {
                    populate: ["language", "addedBy.user"],
                    orderBy: {title: "desc"}
                });
                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(courseSerializer.serializeList(courses));
            });
            test<LocalTestContext>("if sortBy is invalid return 400", async (context) => {
                const response = await makeRequest({sortOrder: "rising"});
                expect(response.statusCode).to.equal(400);
            });
        });
    });

    test<LocalTestContext>("If logged in return courses with vocab levels for user", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        await context.courseFactory.create(10, {language: await context.languageFactory.createOne()});

        const response = await makeRequest({}, session.token);

        let courses = await context.courseRepo.find({isPublic: true}, {populate: ["language", "addedBy.user"], orderBy: {title: "asc"}});
        courses = await context.courseRepo.annotateVocabsByLevel(courses, user.id);
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(courseSerializer.serializeList(courses));
    });
    test<LocalTestContext>("If logged in as author of courses return private courses", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        await context.courseFactory.create(10, {addedBy: user.profile, language: await context.languageFactory.createOne()});

        const response = await makeRequest({}, session.token);

        let courses = await context.courseRepo.find({$or: [{isPublic: true}, {addedBy: user.profile}]}, {
            populate: ["language", "addedBy.user"],
            orderBy: {title: "asc"}
        });
        courses = await context.courseRepo.annotateVocabsByLevel(courses, user.id);
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(courseSerializer.serializeList(courses));
    });

});

/**@link CourseController#createCourse*/
describe("POST courses/", function () {
    const makeRequest = async ({data, files = {}}: {
        data: object; files?: { [key: string]: { value: ""; } | { value: Buffer; fileName?: string, mimeType?: string } };
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

            expect(response.statusCode).to.equal(201);
            expect(response.json()).toEqual(expect.objectContaining(courseSerializer.serialize(newCourse)));
            expect(await context.courseRepo.findOne({title: newCourse.title, language})).not.toBeNull();
        });
        test<LocalTestContext>("If optional fields are provided use provided values", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();

            const newCourse = context.courseFactory.makeOne({
                addedBy: user.profile,
                language: language,
                lessons: [],
                vocabsByLevel: defaultVocabsByLevel()
            });
            const response = await makeRequest({
                data: {
                    title: newCourse.title,
                    description: newCourse.description,
                    languageCode: language.code,
                    isPublic: newCourse.isPublic,
                },
                files: {image: readSampleFile("images/lorem-ipsum-69_8KB-1_1ratio.png")}
            }, session.token);

            expect(response.statusCode).to.equal(201);
            expect(response.json()).toEqual(expect.objectContaining(courseSerializer.serialize(newCourse, {ignore: ["image"]})));
            expect(await context.courseRepo.findOne({title: newCourse.title, language})).not.toBeNull();
            expect(fs.existsSync(response.json().image)).toBeTruthy();
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
        test<LocalTestContext>("If level is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newCourse = context.courseFactory.makeOne({language: language});

            const response = await makeRequest({
                data: {
                    title: newCourse.title,
                    languageCode: language.code,
                    level: "high"
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

                const response = await makeRequest({
                    data: {
                        title: newCourse.title,
                        languageCode: language.code,
                    },
                    files: {image: readSampleFile("images/santa-barbara-1_8MB-1_1ratio.jpg")}
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

/**@link CourseController#getCourse*/
describe("GET courses/:courseId/", function () {
    const makeRequest = async (courseId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `courses/${courseId}`,
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

            const response = await makeRequest(course.id, session.token);

            await context.courseRepo.annotateVocabsByLevel([course], user.id);
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
            language: await context.languageFactory.createOne()
        });
        const session = await context.sessionFactory.createOne({user: author});

        const response = await makeRequest(course.id, session.token);

        await context.courseRepo.annotateVocabsByLevel([course], author.id);
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(courseSerializer.serialize(course));
    });
});

/**@link CourseController#updateCourse*/
describe("PUT courses/:courseId/", function () {
    const makeRequest = async (courseId: number | string, {data, files = {}}: {
        data?: object; files?: { [key: string]: { value: ""; } | { value: Buffer; fileName?: string, mimeType?: string } };
    }, authToken?: string) => {
        return await fetchWithFiles({
            options: {
                method: "PUT",
                url: `courses/${courseId}`,
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

            course = await context.courseRepo.findOneOrFail({id: course.id}, {populate: ["language", "addedBy", "addedBy.user", "addedBy.languagesLearning"]});
            await context.em.populate(course, ["lessons"], {orderBy: {lessons: {orderInCourse: "asc"}}});
            await context.courseRepo.annotateVocabsByLevel([course], author.id);


            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serialize(course));
            expect(response.json().lessons.map((l: LessonSchema) => l.id)).toEqual(shuffledLessonIds);
            const updatedFields: (keyof CourseSchema)[] = ["title", "description", "isPublic", "level"];
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

            course = await context.courseRepo.findOneOrFail({id: course.id}, {populate: ["language", "addedBy", "addedBy.user", "addedBy.languagesLearning"]});
            await context.em.populate(course, ["lessons"], {orderBy: {lessons: {orderInCourse: "asc"}}});
            await context.courseRepo.annotateVocabsByLevel([course], author.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serialize(course));
            expect(course.image).toEqual("");
            expect(response.json().lessons.map((l: LessonSchema) => l.id)).toEqual(shuffledLessonIds);
            const updatedFields: (keyof CourseSchema)[] = ["title", "description", "isPublic", "level", "image"];
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

            course = await context.courseRepo.findOneOrFail({id: course.id}, {populate: ["language", "addedBy", "addedBy.user", "addedBy.languagesLearning"]});
            await context.em.populate(course, ["lessons"], {orderBy: {lessons: {orderInCourse: "asc"}}});
            await context.courseRepo.annotateVocabsByLevel([course], author.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serialize(course));
            expect(fs.existsSync(course.image)).toBeTruthy();
            expect(response.json().lessons.map((l: LessonSchema) => l.id)).toEqual(shuffledLessonIds);
            const updatedFields: (keyof CourseSchema)[] = ["title", "description", "isPublic", "level"];
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

                const response = await makeRequest(course.id, {
                    data: {
                        title: faker.random.alpha(300),
                        description: updatedCourse.description,
                        isPublic: updatedCourse.isPublic,
                        lessonsOrder: shuffleArray(courseLessons).map(l => l.id)
                    },
                    files: {
                        image: readSampleFile("images/santa-barbara-1_8MB-1_1ratio.jpg")
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

/**@link CourseController#getUserCoursesLearning*/
describe("GET users/{username}/courses/", () => {
    const makeRequest = async (username: string | "me", queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/${username}/courses/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };

    describe("If user is logged in and there are no filters return courses with a lesson the user is learning", () => {
        test<LocalTestContext>("If username is me", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const courses = await context.courseFactory.create(10, {
                language: await context.languageFactory.createOne(),
                lessons: [],
                isPublic: true
            });
            let lessons: Lesson[] = [];
            for (let i = 0; i < courses.length; i++)
                lessons.push(...await context.lessonFactory.create(3, {course: courses[i]}));
            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
            await context.em.flush();

            const response = await makeRequest("me", {}, session.token);

            const userCourses = await context.courseRepo.find({lessons: {learners: user.profile}}, {
                populate: ["language", "addedBy.user"],
                orderBy: {title: "asc"}
            });
            await context.courseRepo.annotateVocabsByLevel(userCourses, user.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serializeList(userCourses));
        });
        test<LocalTestContext>("If username belongs to the currently logged in user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const courses = await context.courseFactory.create(10, {
                language: await context.languageFactory.createOne(),
                lessons: [],
                isPublic: true
            });
            let lessons: Lesson[] = [];
            for (let i = 0; i < courses.length; i++)
                lessons.push(...await context.lessonFactory.create(3, {course: courses[i]}));
            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
            await context.em.flush();

            const response = await makeRequest(user.username, {}, session.token);

            const userCourses = await context.courseRepo.find({lessons: {learners: user.profile}}, {
                populate: ["language", "addedBy.user"],
                orderBy: {title: "asc"}
            });
            await context.courseRepo.annotateVocabsByLevel(userCourses, user.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serializeList(userCourses));
        });
    });
    test<LocalTestContext>("If user is not logged in return 401", async () => {
        const response = await makeRequest("me");
        expect(response.statusCode).to.equal(401);
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
    describe("test languageCode filter", () => {
        test<LocalTestContext>("If language filter is valid and language exists only return courses in that language with a lesson the user is learning", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            const courses = [...await context.courseFactory.create(5, {language: language1, lessons: [], isPublic: true}),
                ...await context.courseFactory.create(5, {language: language2, lessons: [], isPublic: true})];
            let lessons: Lesson[] = [];
            for (let i = 0; i < courses.length; i++)
                lessons.push(...await context.lessonFactory.create(3, {course: courses[i]}));
            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
            await context.em.flush();

            const response = await makeRequest("me", {languageCode: language1.code}, session.token);
            const userCourses = await context.courseRepo.find(
                {isPublic: true, language: language1, lessons: {learners: user.profile}},
                {populate: ["addedBy.user"], orderBy: {title: "asc"}, refresh: true});

            await context.courseRepo.annotateVocabsByLevel(userCourses, user.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serializeList(userCourses));
        });
        test<LocalTestContext>("If language does not exist return empty course list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const courses = await context.courseFactory.create(10, {
                language: await context.languageFactory.createOne(),
                lessons: [],
                isPublic: true
            });
            let lessons: Lesson[] = [];
            for (let i = 0; i < courses.length; i++)
                lessons.push(...await context.lessonFactory.create(3, {course: courses[i]}));
            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
            await context.em.flush();

            const response = await makeRequest("me", {languageCode: faker.random.alpha({count: 4})}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual([]);
        });
        test<LocalTestContext>("If language filter is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});

            const response = await makeRequest("me", {languageCode: 12345}, session.token);

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test addedBy filter", () => {
        test<LocalTestContext>("If addedBy filter is valid and user exists only return public courses added by that user with a lesson the logged in user is learning", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const user1 = await context.userFactory.createOne();
            const user2 = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const courses = [...await context.courseFactory.create(5, {addedBy: user1.profile, language, lessons: [], isPublic: true}),
                ...await context.courseFactory.create(5, {addedBy: user2.profile, language, lessons: [], isPublic: true})];
            let lessons: Lesson[] = [];
            for (let i = 0; i < courses.length; i++)
                lessons.push(...await context.lessonFactory.create(3, {course: courses[i]}));
            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
            await context.em.flush();

            const response = await makeRequest("me", {addedBy: user1.username}, session.token);
            const userCourses = await context.courseRepo.find(
                {isPublic: true, addedBy: {user: {username: user1.username}}, lessons: {learners: user.profile}},
                {populate: ["addedBy.user"], orderBy: {title: "asc"}, refresh: true});

            await context.courseRepo.annotateVocabsByLevel(userCourses, user.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serializeList(userCourses));
        });
        test<LocalTestContext>("If addedBy is me return courses added by the logged in user with a lesson the they are learning", async (context) => {
            const user = await context.userFactory.createOne();
            const otherUser = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const courses = [...await context.courseFactory.create(5, {addedBy: user.profile, language, lessons: [], isPublic: true}),
                ...await context.courseFactory.create(5, {addedBy: otherUser.profile, language, lessons: [], isPublic: true})];
            let lessons: Lesson[] = [];
            for (let i = 0; i < courses.length; i++)
                lessons.push(...await context.lessonFactory.create(3, {course: courses[i]}));
            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
            await context.em.flush();

            const response = await makeRequest("me", {addedBy: "me"}, session.token);
            const userCourses = await context.courseRepo.find(
                {isPublic: true, addedBy: {user: {username: user.username}}, lessons: {learners: user.profile}},
                {populate: ["addedBy.user"], orderBy: {title: "asc"}, refresh: true});

            await context.courseRepo.annotateVocabsByLevel(userCourses, user.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serializeList(userCourses));
        });
        test<LocalTestContext>("If user does not exist return empty course list", async (context) => {
            const user = await context.userFactory.createOne();
            const otherUser = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const courses = [...await context.courseFactory.create(5, {addedBy: user.profile, language, lessons: [], isPublic: true}),
                ...await context.courseFactory.create(5, {addedBy: otherUser.profile, language, lessons: [], isPublic: true})];
            let lessons: Lesson[] = [];
            for (let i = 0; i < courses.length; i++)
                lessons.push(...await context.lessonFactory.create(3, {course: courses[i]}));
            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
            await context.em.flush();

            const response = await makeRequest("me", {addedBy: faker.random.alpha({count: 20})}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual([]);
        });
        test<LocalTestContext>("If addedBy filter is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            await context.courseFactory.create(10, {language: await context.languageFactory.createOne()});

            const response = await makeRequest(user.username, {addedBy: "!@#%#%^#^!"}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    // TODO test empty string search query and SQL injection search query
    describe("test searchQuery filter", () => {
        test<LocalTestContext>("If searchQuery is valid return courses with query in title or description with a lesson the user is learning", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const searchQuery = "search query";
            const courses: Course[] = [];
            for (let i = 0; i < 10; i++) {
                if (i % 2 == 0)
                    courses.push(await context.courseFactory.createOne({
                        language: language,
                        title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`,
                        isPublic: true
                    }));
                else
                    courses.push(await context.courseFactory.createOne({
                        language: language,
                        description: `description ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`,
                        isPublic: true
                    }));
            }
            courses.push(...await context.courseFactory.create(5, {language, isPublic: true}));
            let lessons: Lesson[] = [];
            for (let i = 0; i < courses.length; i++)
                lessons.push(...await context.lessonFactory.create(3, {course: courses[i]}));
            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
            await context.em.flush();

            const response = await makeRequest(user.username, {searchQuery: searchQuery}, session.token);

            const userCourses = await context.courseRepo.find({
                isPublic: true,
                lessons: {learners: user.profile},
                $or: [{title: {$ilike: `%${searchQuery}%`}}, {description: {$ilike: `%${searchQuery}%`}}],
            }, {populate: ["addedBy.user", "language"], orderBy: {title: "asc"}});
            await context.courseRepo.annotateVocabsByLevel(userCourses, user.id);
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serializeList(userCourses));
        });
        test<LocalTestContext>("If searchQuery is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            await context.courseFactory.create(10, {language: await context.languageFactory.createOne()});

            const response = await makeRequest(user.username, {searchQuery: faker.random.alpha({count: 300})}, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If no courses match search query return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const courses = await context.courseFactory.create(10, {language, isPublic: true});
            let lessons: Lesson[] = [];
            for (let i = 0; i < courses.length; i++)
                lessons.push(...await context.lessonFactory.create(3, {course: courses[i]}));
            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
            await context.em.flush();

            const response = await makeRequest(user.username, {searchQuery: faker.random.alpha({count: 200})}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual([]);
        });
    });
    describe("test sort", () => {
        describe("test sortBy", () => {
            test<LocalTestContext>("test sortBy title", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const courses = await context.courseFactory.create(10, {
                    language: await context.languageFactory.createOne(),
                    lessons: [],
                    isPublic: true
                });
                let lessons: Lesson[] = [];
                for (let i = 0; i < courses.length; i++)
                    lessons.push(...await context.lessonFactory.create(3, {course: courses[i]}));
                lessons = shuffleArray(lessons);
                for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                    await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
                await context.em.flush();

                const response = await makeRequest("me", {sortBy: "title"}, session.token);

                const userCourses = await context.courseRepo.find({lessons: {learners: user.profile}}, {
                    populate: ["language", "addedBy.user"],
                    orderBy: {title: "asc"}
                });
                await context.courseRepo.annotateVocabsByLevel(userCourses, user.id);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(courseSerializer.serializeList(userCourses));
            });
            test<LocalTestContext>("test sortBy createdDate", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const courses = await context.courseFactory.create(10, {
                    language: await context.languageFactory.createOne(),
                    lessons: [],
                    isPublic: true
                });
                let lessons: Lesson[] = [];
                for (let i = 0; i < courses.length; i++)
                    lessons.push(...await context.lessonFactory.create(3, {course: courses[i]}));
                lessons = shuffleArray(lessons);
                for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                    await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
                await context.em.flush();

                const response = await makeRequest("me", {sortBy: "createdDate"}, session.token);

                const userCourses = await context.courseRepo.find({lessons: {learners: user.profile}}, {
                    populate: ["language", "addedBy.user"],
                    orderBy: {addedOn: "asc"}
                });
                await context.courseRepo.annotateVocabsByLevel(userCourses, user.id);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(courseSerializer.serializeList(userCourses));
            });
            test<LocalTestContext>("test sortBy learnersCount", async (context) => {

                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const courses = await context.courseFactory.create(10, {
                    language: await context.languageFactory.createOne(),
                    lessons: [],
                    isPublic: true
                });
                let lessons: Lesson[] = [];
                for (let i = 0; i < courses.length; i++)
                    lessons.push(...await context.lessonFactory.create(3, {course: courses[i]}));
                lessons = shuffleArray(lessons);
                for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                    await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
                await context.em.flush();

                const response = await makeRequest("me", {sortBy: "learnersCount"}, session.token);

                const userCourses = await context.courseRepo.find({lessons: {learners: user.profile}}, {
                    populate: ["language", "addedBy.user"],
                    orderBy: {learnersCount: "asc"}
                });
                await context.courseRepo.annotateVocabsByLevel(userCourses, user.id);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(courseSerializer.serializeList(userCourses));
            });
            test<LocalTestContext>("if sortBy is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});

                const response = await makeRequest("me", {sortBy: "lessons"}, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<LocalTestContext>("test sortOrder ascending", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const courses = await context.courseFactory.create(10, {
                    language: await context.languageFactory.createOne(),
                    lessons: [],
                    isPublic: true
                });
                let lessons: Lesson[] = [];
                for (let i = 0; i < courses.length; i++)
                    lessons.push(...await context.lessonFactory.create(3, {course: courses[i]}));
                lessons = shuffleArray(lessons);
                for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                    await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
                await context.em.flush();

                const response = await makeRequest("me", {sortBy: "title", sortOrder: "asc"}, session.token);

                const userCourses = await context.courseRepo.find({lessons: {learners: user.profile}}, {
                    populate: ["language", "addedBy.user"],
                    orderBy: {title: "asc"}
                });
                await context.courseRepo.annotateVocabsByLevel(userCourses, user.id);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(courseSerializer.serializeList(userCourses));
            });
            test<LocalTestContext>("test sortOrder descending", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const courses = await context.courseFactory.create(10, {
                    language: await context.languageFactory.createOne(),
                    lessons: [],
                    isPublic: true
                });
                let lessons: Lesson[] = [];
                for (let i = 0; i < courses.length; i++)
                    lessons.push(...await context.lessonFactory.create(3, {course: courses[i]}));
                lessons = shuffleArray(lessons);
                for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                    await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
                await context.em.flush();

                const response = await makeRequest("me", {sortBy: "title", sortOrder: "desc"}, session.token);

                const userCourses = await context.courseRepo.find({lessons: {learners: user.profile}}, {
                    populate: ["language", "addedBy.user"],
                    orderBy: {title: "desc"}
                });
                await context.courseRepo.annotateVocabsByLevel(userCourses, user.id);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(courseSerializer.serializeList(userCourses));
            });
            test<LocalTestContext>("if sortOrder is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});

                const response = await makeRequest("me", {sortOrder: "rising"}, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
    });
});