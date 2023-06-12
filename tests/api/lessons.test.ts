import {beforeEach, describe, expect, test, TestContext} from "vitest";
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
import {buildQueryString, fetchRequest, fetchWithFiles, readSampleFile} from "@/tests/api/utils.js";
import {lessonSerializer} from "@/src/presentation/response/serializers/entities/LessonSerializer.js";
import {faker} from "@faker-js/faker";
import {randomCase, randomEnum, shuffleArray} from "@/tests/utils.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {EntityRepository} from "@mikro-orm/core";
import {parsers} from "@/src/utils/parsers/parsers.js";
import {MapLessonVocab} from "@/src/models/entities/MapLessonVocab.js";
import fs from "fs-extra";
import {MapLearnerLesson} from "@/src/models/entities/MapLearnerLesson.js";
import {CourseSchema} from "@/src/presentation/response/interfaces/entities/CourseSchema.js";
import {courseSerializer} from "@/src/presentation/response/serializers/entities/CourseSerializer.js";
import {LessonSchema} from "@/src/presentation/response/interfaces/entities/LessonSchema.js";

interface LocalTestContext extends TestContext {
    languageFactory: LanguageFactory;
    lessonFactory: LessonFactory;
    courseFactory: CourseFactory;
    courseRepo: CourseRepo;
    lessonRepo: LessonRepo;
    vocabRepo: EntityRepository<Vocab>;
}

beforeEach<LocalTestContext>((context) => {
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
});

/**@link LessonController#getLessons*/
describe("GET lessons/", () => {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `lessons/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    test<LocalTestContext>("If there are no filters and not logged in return all public lessons", async (context) => {
        const language = await context.languageFactory.createOne();
        await context.lessonFactory.create(10, {course: await context.courseFactory.createOne({language: language, isPublic: false})});
        await context.lessonFactory.create(10, {course: await context.courseFactory.createOne({language: language, isPublic: true})});

        const response = await makeRequest();

        const lessons = await context.lessonRepo.find({course: {isPublic: true}}, {
            populate: ["course", "course.language", "course.addedBy.user"],
            orderBy: {title: "asc"}
        });

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
    });
    describe("test languageCode filter", () => {
        test<LocalTestContext>("If language filter is valid and language exists only return public lessons in that language", async (context) => {
            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({language: language1})});
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({language: language2})});

            const response = await makeRequest({languageCode: language1.code});

            const lessons = await context.lessonRepo.find({
                course: {
                    language: language1,
                    isPublic: true
                }
            }, {populate: ["course", "course.addedBy.user"], orderBy: {title: "asc"}});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
        });
        test<LocalTestContext>("If language does not exist return empty lessons list", async (context) => {
            const language = await context.languageFactory.createOne();
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({language: language})});
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({language: await context.languageFactory.createOne()})});

            const response = await makeRequest({languageCode: faker.random.alpha({count: 4})});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual([]);
        });
        test<LocalTestContext>("If language filter is invalid return 400", async () => {
            const response = await makeRequest({languageCode: 12345});

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test addedBy filter", () => {
        test<LocalTestContext>("If addedBy filter is valid and user exists only return public lessons added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            await context.lessonFactory.create(5, {
                course: await context.courseFactory.createOne({
                    language: language,
                    addedBy: user.profile
                })
            });
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({language: language})});

            const response = await makeRequest({addedBy: user.username});

            const lessons = await context.lessonRepo.find({
                course: {
                    addedBy: user.profile,
                    isPublic: true
                }
            }, {populate: ["course", "course.addedBy.user"], orderBy: {title: "asc"}});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
        });
        test<LocalTestContext>("If addedBy is me and signed in return lessons added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            await context.lessonFactory.create(5, {
                course: await context.courseFactory.createOne({
                    language: await context.languageFactory.createOne(),
                    addedBy: user.profile
                })
            });
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({language: await context.languageFactory.createOne(),})});

            const response = await makeRequest({addedBy: "me"}, session.token);

            let lessons = await context.lessonRepo.find({
                course: {addedBy: user.profile}
            }, {populate: ["course", "course.addedBy.user"], orderBy: {title: "asc"}});
            lessons = await context.lessonRepo.annotateVocabsByLevel(lessons, user.id);
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
        });
        test<LocalTestContext>("If addedBy is me and not signed in return 401", async (context) => {
            await context.lessonFactory.create(10, {course: await context.courseFactory.createOne({language: await context.languageFactory.createOne(),})});

            const response = await makeRequest({addedBy: "me"});

            expect(response.statusCode).to.equal(401);
        });
        test<LocalTestContext>("If user does not exist return empty lesson list", async (context) => {
            await context.lessonFactory.create(10, {course: await context.courseFactory.createOne({language: await context.languageFactory.createOne(),})});

            const response = await makeRequest({addedBy: faker.random.alpha({count: 20})});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual([]);
        });
        test<LocalTestContext>("If addedBy filter is invalid return 400", async () => {
            const response = await makeRequest({addedBy: "!@#%#%^#^!"});
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test searchQuery filter", () => {
        test<LocalTestContext>("If searchQuery is valid return lessons with query in title", async (context) => {
            const language = await context.languageFactory.createOne();
            const courses = await context.courseFactory.create(3, {language: language, lessons: []});
            const searchQuery = "search query";
            for (let i = 0; i < 10; i++) {
                await context.lessonFactory.createOne({
                    title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`,
                    course: courses[faker.datatype.number({min: 0, max: courses.length - 1})]
                });
            }
            await context.lessonFactory.create(5, {course: courses[faker.datatype.number({min: 0, max: courses.length - 1})]});

            const response = await makeRequest({searchQuery: searchQuery});

            let lessons = await context.lessonRepo.find({
                title: {$ilike: `%${searchQuery}%`},
                course: {isPublic: true,}
            }, {populate: ["course", "course.language", "course.addedBy.user"], orderBy: {title: "asc"}});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
        });
        test<LocalTestContext>("If searchQuery is invalid return 400", async () => {
            const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})});

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If no lessons match search query return empty list", async (context) => {
            await context.lessonFactory.create(10, {course: await context.courseFactory.createOne({language: await context.languageFactory.createOne()})});

            const response = await makeRequest({searchQuery: faker.random.alpha({count: 200})});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual([]);
        });
    });
    describe("test level filter", () => {
        test<LocalTestContext>("If the level is valid return lessons in that level", async (context) => {
            const level = randomEnum(LanguageLevel);
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({isPublic: true, language: language});
            await context.lessonFactory.create(5, {level: level, course});
            await context.lessonFactory.create(5, {course});

            const response = await makeRequest({level: level});

            const lessons = await context.lessonRepo.find({
                level: level,
                course: {
                    isPublic: true
                }
            }, {populate: ["course", "course.language", "course.addedBy.user"], orderBy: {title: "asc"}});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
        });
        test<LocalTestContext>("If the level is invalid return 400", async () => {
            const response = await makeRequest({level: "hard"});

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test hasAudio filter", () => {
        test<LocalTestContext>("If hasAudio is true return lessons with audio", async (context) => {
            const language = await context.languageFactory.createOne();
            await context.lessonFactory.create(5, {
                course: await context.courseFactory.createOne({language, isPublic: true}),
                audio: "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg"
            });
            await context.lessonFactory.create(5, {
                course: await context.courseFactory.createOne({language: language, isPublic: true}),
                audio: ""
            });

            const response = await makeRequest({hasAudio: true});

            let lessons = await context.lessonRepo.find({
                audio: {$ne: ""},
                course: {isPublic: true}
            }, {populate: ["course", "course.language", "course.addedBy.user"], orderBy: {title: "asc"}});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
        });
        test<LocalTestContext>("If hasAudio is false return lessons with no audio", async (context) => {
            const language = await context.languageFactory.createOne();
            await context.lessonFactory.create(5, {
                course: await context.courseFactory.createOne({language, isPublic: true}),
                audio: "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg"
            });
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({language, isPublic: true}), audio: ""});

            const response = await makeRequest({hasAudio: false});

            let lessons = await context.lessonRepo.find({
                audio: "",
                course: {isPublic: true}
            }, {populate: ["course", "course.language", "course.addedBy.user"], orderBy: {title: "asc"}});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
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
                await context.lessonFactory.createOne({course, title: "abc"});
                await context.lessonFactory.createOne({course, title: "def"});

                const response = await makeRequest({sortBy: "title", sortOrder: "asc"});

                const lessons = await context.lessonRepo.find({course: {isPublic: true}}, {
                    populate: ["course", "course.language", "course.addedBy.user"],
                    orderBy: {title: "asc"}
                });

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
            });
            test<LocalTestContext>("test sortBy createdDate", async (context) => {
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language});
                await context.lessonFactory.createOne({course, addedOn: "2023-03-15T20:29:42.765Z",});
                await context.lessonFactory.createOne({course, addedOn: "2018-07-22T10:30:45.000Z"});

                const response = await makeRequest({sortBy: "createdDate", sortOrder: "asc"});

                const lessons = await context.lessonRepo.find({course: {isPublic: true}}, {
                    populate: ["course", "course.language", "course.addedBy.user"],
                    orderBy: {addedOn: "asc"}
                });
                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
            });
            test<LocalTestContext>("test sortBy learnersCount", async (context) => {
                const learner = await context.userFactory.createOne();
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language});
                await context.lessonFactory.createOne({course, learners: learner.profile});
                await context.lessonFactory.createOne({course});

                const response = await makeRequest({sortBy: "learnersCount", sortOrder: "asc"});

                const lessons = await context.lessonRepo.find({course: {isPublic: true}}, {
                    populate: ["course", "course.language", "course.addedBy.user"],
                    orderBy: {learnersCount: "asc"}
                });

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
            });
            test<LocalTestContext>("if sortBy is invalid return 400", async (context) => {
                const response = await makeRequest({sortBy: "text"});
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<LocalTestContext>("test sortOrder ascending", async (context) => {
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language});
                await context.lessonFactory.createOne({course, title: "abc"});
                await context.lessonFactory.createOne({course, title: "def"});

                const response = await makeRequest({sortBy: "title", sortOrder: "asc"});

                const lessons = await context.lessonRepo.find({course: {isPublic: true}}, {
                    populate: ["course", "course.language", "course.addedBy.user"],
                    orderBy: {title: "asc"}
                });

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
            });
            test<LocalTestContext>("test sortOrder descending", async (context) => {
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language});
                await context.lessonFactory.createOne({course, title: "abc"});
                await context.lessonFactory.createOne({course, title: "def"});

                const response = await makeRequest({sortBy: "title", sortOrder: "desc"});

                const lessons = await context.lessonRepo.find({course: {isPublic: true}}, {
                    populate: ["course", "course.language", "course.addedBy.user"],
                    orderBy: {title: "desc"}
                });

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
            });
            test<LocalTestContext>("if sortBy is invalid return 400", async (context) => {
                const response = await makeRequest({sortOrder: "rising"});
                expect(response.statusCode).to.equal(400);
            });
        });
    });
    test<LocalTestContext>("If logged in return lessons with vocab levels for user", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        await context.lessonFactory.create(10, {course: await context.courseFactory.createOne({language, isPublic: false})});
        await context.lessonFactory.create(10, {course: await context.courseFactory.createOne({language, isPublic: true})});

        const response = await makeRequest({}, session.token);

        let lessons = await context.lessonRepo.find({course: {isPublic: true}}, {
            populate: ["course", "course.language", "course.addedBy.user"],
            orderBy: {title: "asc"}
        });
        lessons = await context.lessonRepo.annotateVocabsByLevel(lessons, user.id);
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
    });
    test<LocalTestContext>("If logged in as author of lesson courses return private lessons", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        await context.lessonFactory.create(10, {
            course: await context.courseFactory.createOne({
                language,
                isPublic: false,
                addedBy: user.profile
            })
        });
        await context.lessonFactory.create(10, {course: await context.courseFactory.createOne({language, isPublic: true})});

        const response = await makeRequest({}, session.token);

        let lessons = await context.lessonRepo.find({$or: [{course: {isPublic: true}}, {course: {addedBy: user.profile}}]}, {
            populate: ["course", "course.language", "course.addedBy.user"],
            orderBy: {title: "asc"}
        });
        lessons = await context.lessonRepo.annotateVocabsByLevel(lessons, user.id);
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
    });
});

/**@link LessonController#createLesson*/
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

    describe("If all fields are valid a new lesson should be created and return 201", () => {
        test<LocalTestContext>("If optional fields are missing use default values", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne({code: "en"});
            const course = await context.courseFactory.createOne({language: language, addedBy: user.profile, lessons: []});
            let newLesson: Lesson | null = context.lessonFactory.makeOne({course: course});

            const response = await makeRequest({
                data: {
                    title: newLesson.title,
                    text: newLesson.text,
                    courseId: course.id,
                }
            }, session.token);

            expect(response.statusCode).to.equal(201);
            newLesson = await context.lessonRepo.findOne({course: course}, {populate: ["course", "course.language", "course.addedBy.user"]});
            expect(newLesson).not.toBeNull();
            if (!newLesson) return;
            await context.lessonRepo.annotateVocabsByLevel([newLesson], user.id);
            await context.courseRepo.annotateVocabsByLevel([newLesson.course], user.id);
            expect(response.json()).toEqual(expect.objectContaining(lessonSerializer.serialize(newLesson)));

            const lessonWordsText = parsers["en"].parseText(`${newLesson.title} ${newLesson.text}`);
            const lessonVocabs = await context.vocabRepo.find({text: lessonWordsText, language: course.language});
            const lessonVocabMappings = await context.em.find(MapLessonVocab, {vocab: lessonVocabs, lesson: newLesson});

            expect(lessonVocabs.length).toEqual(lessonWordsText.length);
            expect(lessonVocabMappings.length).toEqual(lessonWordsText.length);
        });
        test<LocalTestContext>("If optional fields are provided use provided values", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne({code: "en"});
            const course = await context.courseFactory.createOne({language: language, addedBy: user.profile, lessons: []});
            let newLesson: Lesson | null = context.lessonFactory.makeOne({course: course});

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
            newLesson = await context.lessonRepo.findOne({course: course}, {populate: ["course", "course.language", "course.addedBy.user"]});
            expect(newLesson).not.toBeNull();
            if (!newLesson) return;
            await context.lessonRepo.annotateVocabsByLevel([newLesson], user.id);
            await context.courseRepo.annotateVocabsByLevel([newLesson.course], user.id);
            expect(response.json()).toEqual(expect.objectContaining(lessonSerializer.serialize(newLesson)));

            const lessonWordsText = parsers["en"].parseText(`${newLesson.title} ${newLesson.text}`);
            const lessonVocabs = await context.vocabRepo.find({text: lessonWordsText, language: course.language});
            const lessonVocabMappings = await context.em.find(MapLessonVocab, {vocab: lessonVocabs, lesson: newLesson});

            expect(lessonVocabs.length).toEqual(lessonWordsText.length);
            expect(lessonVocabMappings.length).toEqual(lessonWordsText.length);
        });
    });
    test<LocalTestContext>("If user not logged in return 401", async (context) => {
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

                const response = await makeRequest({
                    data: {
                        title: newLesson.title,
                        text: newLesson.text,
                        courseId: course.id,
                    },
                    files: {image: readSampleFile("images/santa-barbara-1_8MB-1_1ratio.jpg")}
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

                const response = await makeRequest({
                    data: {
                        title: newLesson.title,
                        text: newLesson.text,
                        courseId: course.id,
                    },
                    files: {
                        audio: readSampleFile("audio/beethoven-174_1MB.wav")
                    }
                }, session.token);

                expect(response.statusCode).to.equal(413);
            });
        });
    });
});

/**@link LessonController#getLesson*/
describe("GET lessons/:lessonId", () => {
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
            const lesson = await context.lessonFactory.createOne({
                course: await context.courseFactory.createOne({
                    language,
                    isPublic: true
                })
            });

            const response = await makeRequest(lesson.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serialize(lesson));
        });
        test<LocalTestContext>("If the user is logged in return lesson and course with vocab levels", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const lesson = await context.lessonFactory.createOne({
                course: await context.courseFactory.createOne({
                    language,
                    isPublic: true
                })
            });

            const response = await makeRequest(lesson.id, session.token);

            await context.lessonRepo.annotateVocabsByLevel([lesson], user.id);
            await context.courseRepo.annotateVocabsByLevel([lesson.course], user.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serialize(lesson));
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

/**@link LessonController#updateLesson*/
describe("PUT lessons/:lessonId", () => {
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

    describe("If the lesson exists, user is logged in as author and all fields are valid, update lesson and return 200", async () => {
        test<LocalTestContext>("If image and audio are not provided, keep old image and audio", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne({code: "en"});
            const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
            const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
            let lesson = await context.lessonFactory.createOne({course: course});

            const oldLessonImage = lesson.image;
            const oldLessonAudio = lesson.audio;
            const updatedLesson = await context.lessonFactory.makeOne({course: newCourse});

            const response = await makeRequest(lesson.id, {
                data: {
                    courseId: newCourse.id,
                    title: updatedLesson.title,
                    text: updatedLesson.text,
                }
            }, session.token);

            lesson = await context.lessonRepo.findOneOrFail({id: lesson.id}, {populate: ["course", "course.language", "course.addedBy.user"]});
            await context.em.populate(lesson, ["course"]);
            await context.lessonRepo.annotateVocabsByLevel([lesson], author.id);
            await context.courseRepo.annotateVocabsByLevel([lesson.course], author.id);
            await context.courseRepo.annotateVocabsByLevel([updatedLesson.course], author.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serialize(lesson));
            expect(lesson.image).toEqual(oldLessonImage);
            expect(lesson.audio).toEqual(oldLessonAudio);
            expect(lesson.orderInCourse).toEqual(await newCourse.lessons.loadCount() - 1);


            const lessonWordsText = parsers["en"].parseText(`${updatedLesson.title} ${updatedLesson.text}`);
            const lessonVocabs = await context.vocabRepo.find({text: lessonWordsText, language: course.language});
            const lessonVocabMappings = await context.em.find(MapLessonVocab, {vocab: lessonVocabs, lesson: lesson});

            expect(lessonVocabs.length).toEqual(lessonWordsText.length);
            expect(lessonVocabMappings.length).toEqual(lessonWordsText.length);
            const updatedFields: (keyof LessonSchema)[] = ["course", "title", "text"];
            expect(lessonSerializer.serialize(lesson, {include: updatedFields})).toEqual(lessonSerializer.serialize(updatedLesson, {include: updatedFields}));
        });
        test<LocalTestContext>("If new image and audio are blank clear lesson image and audio", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne({code: "en"});
            const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
            const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
            let lesson = await context.lessonFactory.createOne({course: course});
            const updatedLesson = await context.lessonFactory.makeOne({course: newCourse});

            const response = await makeRequest(lesson.id, {
                data: {
                    courseId: newCourse.id,
                    title: updatedLesson.title,
                    text: updatedLesson.text,
                },
                files: {image: {value: ""}, audio: {value: ""}}
            }, session.token);

            lesson = await context.lessonRepo.findOneOrFail({id: lesson.id}, {populate: ["course", "course.language", "course.addedBy.user"]});
            await context.em.populate(lesson, ["course"]);
            await context.lessonRepo.annotateVocabsByLevel([lesson], author.id);
            await context.courseRepo.annotateVocabsByLevel([lesson.course], author.id);
            await context.courseRepo.annotateVocabsByLevel([updatedLesson.course], author.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serialize(lesson));
            expect(lesson.image).toEqual("");
            expect(lesson.audio).toEqual("");
            expect(lesson.orderInCourse).toEqual(await newCourse.lessons.loadCount() - 1);

            const lessonWordsText = parsers["en"].parseText(`${updatedLesson.title} ${updatedLesson.text}`);
            const lessonVocabs = await context.vocabRepo.find({text: lessonWordsText, language: course.language});
            const lessonVocabMappings = await context.em.find(MapLessonVocab, {vocab: lessonVocabs, lesson: lesson});

            expect(lessonVocabs.length).toEqual(lessonWordsText.length);
            expect(lessonVocabMappings.length).toEqual(lessonWordsText.length);
            const updatedFields: (keyof LessonSchema)[] = ["course", "title", "text"];
            expect(lessonSerializer.serialize(lesson, {include: updatedFields})).toEqual(lessonSerializer.serialize(updatedLesson, {include: updatedFields}));
        });
        test<LocalTestContext>("If new image and audio is provided, update lesson image and audio", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne({code: "en"});
            const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
            const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
            let lesson = await context.lessonFactory.createOne({course: course});
            const oldLessonImage = lesson.image;
            const oldLessonAudio = lesson.audio;
            const updatedLesson = await context.lessonFactory.makeOne({course: newCourse});

            const response = await makeRequest(lesson.id, {
                data: {
                    courseId: newCourse.id,
                    title: updatedLesson.title,
                    text: updatedLesson.text,
                },
                files: {
                    image: readSampleFile("images/lorem-ipsum-69_8KB-1_1ratio.png"),
                    audio: readSampleFile("audio/piano-97_9KB.wav")
                }
            }, session.token);

            lesson = await context.lessonRepo.findOneOrFail({id: lesson.id}, {populate: ["course", "course.language", "course.addedBy.user"]});
            await context.em.populate(lesson, ["course"]);
            await context.lessonRepo.annotateVocabsByLevel([lesson], author.id);
            await context.courseRepo.annotateVocabsByLevel([updatedLesson.course], author.id);
            await context.courseRepo.annotateVocabsByLevel([lesson.course], author.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serialize(lesson));
            expect(fs.existsSync(lesson.image)).toBeTruthy();
            expect(lesson.image).not.toEqual(oldLessonImage);
            expect(lesson.audio).not.toEqual(oldLessonAudio);
            expect(lesson.orderInCourse).toEqual(await newCourse.lessons.loadCount() - 1);

            const lessonWordsText = parsers["en"].parseText(`${updatedLesson.title} ${updatedLesson.text}`);
            const lessonVocabs = await context.vocabRepo.find({text: lessonWordsText, language: course.language});
            const lessonVocabMappings = await context.em.find(MapLessonVocab, {vocab: lessonVocabs, lesson: lesson});

            expect(lessonVocabs.length).toEqual(lessonWordsText.length);
            expect(lessonVocabMappings.length).toEqual(lessonWordsText.length);
            const updatedFields: (keyof LessonSchema)[] = ["course", "title", "text"];
            expect(lessonSerializer.serialize(lesson, {include: updatedFields})).toEqual(lessonSerializer.serialize(updatedLesson, {include: updatedFields}));
        });
    });
    test<LocalTestContext>("If user not logged in return 401", async (context) => {
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({addedBy: author.profile, language: language, lessons: []});
        const newCourse = await context.courseFactory.createOne({addedBy: author.profile, language: language});
        const lesson = await context.lessonFactory.createOne({course: course});
        const updatedLesson = await context.lessonFactory.makeOne({course: course});

        const response = await makeRequest(lesson.id, {
            data: {
                courseId: newCourse.id,
                title: updatedLesson.title,
                text: updatedLesson.text,
            }
        });

        expect(response.statusCode).to.equal(401);
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

                const updatedLesson = await context.lessonFactory.makeOne({course: course});

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

                const response = await makeRequest(lesson.id, {
                    data: {
                        courseId: newCourse.id,
                        title: updatedLesson.title,
                        text: updatedLesson.text,
                    },
                    files: {image: readSampleFile("images/santa-barbara-1_8MB-1_1ratio.jpg")}
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

                const response = await makeRequest(lesson.id, {
                    data: {
                        courseId: newCourse.id,
                        title: updatedLesson.title,
                        text: updatedLesson.text,
                    },
                    files: {
                        audio: readSampleFile("audio/beethoven-174_1MB.wav")
                    }
                }, session.token);

                expect(response.statusCode).to.equal(413);
            });
        });
    });
});

/**@link LessonController#getUserLessonsLearning*/
describe("GET users/:username/lessons", () => {
    const makeRequest = async (username: string | "me", queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/${username}/lessons/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };

    describe("If user is logged in and there are no filters return lessons the user is learning", () => {
        test<LocalTestContext>("If username is me", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const courses = await context.courseFactory.create(3, {language: language, isPublic: true});
            let lessons: Lesson[] = [];
            for (let i = 0; i < courses.length; i++)
                lessons.push(...await context.lessonFactory.create(5, {course: courses[i]}));
            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
            await context.em.flush();

            const response = await makeRequest("me", {}, session.token);

            const userLessons = await context.lessonRepo.find({learners: user.profile}, {
                populate: ["course", "course.language", "course.addedBy.user"],
                orderBy: {title: "asc"}
            });
            await context.lessonRepo.annotateVocabsByLevel(userLessons, user.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(userLessons));
        });
        test<LocalTestContext>("If username belongs to the currently logged in user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const courses = await context.courseFactory.create(3, {language: language, isPublic: true});
            let lessons: Lesson[] = [];
            for (let i = 0; i < courses.length; i++)
                lessons.push(...await context.lessonFactory.create(5, {course: courses[i]}));
            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
            await context.em.flush();

            const response = await makeRequest(user.username, {}, session.token);

            const userLessons = await context.lessonRepo.find({learners: user.profile}, {
                populate: ["course", "course.language", "course.addedBy.user"],
                orderBy: {title: "asc"}
            });
            await context.lessonRepo.annotateVocabsByLevel(userLessons, user.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(userLessons));
        });
    });

    describe("test languageCode filter", () => {
        test<LocalTestContext>("If language filter is valid and language exists only return public lessons in that language", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            const courses = [...await context.courseFactory.create(2, {language: language1, isPublic: true}),
                ...await context.courseFactory.create(2, {language: language2, isPublic: true})];
            let lessons: Lesson[] = [];
            for (let i = 0; i < courses.length; i++)
                lessons.push(...await context.lessonFactory.create(5, {course: courses[i]}));
            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
            await context.em.flush();

            const response = await makeRequest("me", {languageCode: language1.code}, session.token);

            const userLessons = await context.lessonRepo.find({
                course: {language: language1},
                learners: user.profile
            }, {populate: ["course", "course.language", "course.addedBy.user"], orderBy: {title: "asc"}});
            await context.lessonRepo.annotateVocabsByLevel(userLessons, user.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(userLessons));
        });
        test<LocalTestContext>("If language does not exist return empty lessons list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            const courses = [...await context.courseFactory.create(2, {language: language1, isPublic: true}),
                ...await context.courseFactory.create(2, {language: language2, isPublic: true})];
            let lessons: Lesson[] = [];
            for (let i = 0; i < courses.length; i++)
                lessons.push(...await context.lessonFactory.create(5, {course: courses[i]}));
            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
            await context.em.flush();

            const response = await makeRequest("me", {languageCode: faker.random.alpha({count: 4})}, session.token);

            const userLessons = await context.lessonRepo.find({learners: user.profile}, {populate: ["course", "course.language", "course.addedBy.user"]});
            await context.lessonRepo.annotateVocabsByLevel(userLessons, user.id);

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
        test<LocalTestContext>("If addedBy filter is valid and user exists only return public lessons added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const user1 = await context.userFactory.createOne();
            const user2 = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const courses = [...await context.courseFactory.create(2, {language, addedBy: user1.profile, isPublic: true}),
                ...await context.courseFactory.create(2, {language, addedBy: user2.profile, isPublic: true})];
            let lessons: Lesson[] = [];
            for (let i = 0; i < courses.length; i++)
                lessons.push(...await context.lessonFactory.create(5, {course: courses[i]}));
            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
            await context.em.flush();

            const response = await makeRequest("me", {addedBy: user1.username}, session.token);

            const userLessons = await context.lessonRepo.find({
                learners: user.profile,
                course: {addedBy: user1.profile},
            }, {populate: ["course", "course.language", "course.addedBy.user"], orderBy: {title: "asc"}});
            await context.lessonRepo.annotateVocabsByLevel(userLessons, user.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(userLessons));
        });
        test<LocalTestContext>("If addedBy is me and signed in return lessons added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const otherUser = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const courses = [...await context.courseFactory.create(2, {language, addedBy: user.profile, isPublic: true}),
                ...await context.courseFactory.create(2, {language, addedBy: otherUser.profile, isPublic: true})];
            let lessons: Lesson[] = [];
            for (let i = 0; i < courses.length; i++)
                lessons.push(...await context.lessonFactory.create(5, {course: courses[i]}));
            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
            await context.em.flush();

            const response = await makeRequest("me", {addedBy: "me"}, session.token);

            const userLessons = await context.lessonRepo.find({
                course: {addedBy: user.profile},
                learners: user.profile
            }, {populate: ["course", "course.language", "course.addedBy.user"], orderBy: {title: "asc"}});
            await context.lessonRepo.annotateVocabsByLevel(userLessons, user.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(userLessons));
        });
        test<LocalTestContext>("If user does not exist return empty lesson list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            let lessons = await context.lessonFactory.create(10, {course: await context.courseFactory.createOne({language: await context.languageFactory.createOne()})});
            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});

            const response = await makeRequest("me", {addedBy: faker.random.alpha({count: 20})}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual([]);
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
            const courses = await context.courseFactory.create(3, {language: language, lessons: []});
            const searchQuery = "search query";
            let lessons: Lesson[] = [];
            for (let i = 0; i < 10; i++) {
                lessons.push(await context.lessonFactory.createOne({
                    title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`,
                    course: courses[faker.datatype.number({min: 0, max: courses.length - 1})]
                }));
            }

            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
            await context.lessonFactory.create(5, {course: courses[faker.datatype.number({min: 0, max: courses.length - 1})]});

            const response = await makeRequest("me", {searchQuery: searchQuery}, session.token);

            const userLessons = await context.lessonRepo.find({
                title: {$ilike: `%${searchQuery}%`},
                learners: user.profile,
                course: {isPublic: true}
            }, {populate: ["course", "course.addedBy.user"], orderBy: {title: "asc"}});
            await context.lessonRepo.annotateVocabsByLevel(userLessons, user.id);
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(userLessons));
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
            let lessons = await context.lessonFactory.create(10, {course: await context.courseFactory.createOne({language: await context.languageFactory.createOne()})});
            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});

            const response = await makeRequest("me", {searchQuery: faker.random.alpha({count: 200})}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual([]);
        });
    });
    describe("test level filter", () => {
        test<LocalTestContext>("If the level is valid return lessons in that level", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const level = randomEnum(LanguageLevel);
            const language = await context.languageFactory.createOne();
            const course = await context.courseFactory.createOne({isPublic: true, language: language, lessons: []});

            let lessons: Lesson[] = [];
            lessons.push(...await context.lessonFactory.create(5, {course, level}));
            lessons.push(...await context.lessonFactory.create(5, {course}));
            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});
            await context.em.flush();

            const response = await makeRequest("me", {level: level}, session.token);

            const userLessons = await context.lessonRepo.find({
                level: level,
                learners: user.profile
            }, {populate: ["course", "course.language", "course.addedBy.user"], orderBy: {title: "asc"}});
            await context.lessonRepo.annotateVocabsByLevel(userLessons, user.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(userLessons));
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
            let lessons: Lesson[] = [];
            lessons.push(...await context.lessonFactory.create(5, {
                course: await context.courseFactory.createOne({language, isPublic: true}),
                audio: "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg"
            }));
            lessons.push(...await context.lessonFactory.create(5, {
                course: await context.courseFactory.createOne({language: language, isPublic: true}),
                audio: ""
            }));
            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});

            const response = await makeRequest("me", {hasAudio: true}, session.token);

            const userLessons = await context.lessonRepo.find({
                learners: user.profile,
                audio: {$ne: ""},
                course: {isPublic: true}
            }, {populate: ["course", "course.language", "course.addedBy.user"]});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(userLessons));
        });
        test<LocalTestContext>("If hasAudio is false return lessons with no audio", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            let lessons: Lesson[] = [];
            lessons.push(...await context.lessonFactory.create(5, {
                course: await context.courseFactory.createOne({language, isPublic: true}),
                audio: "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg"
            }));
            lessons.push(...await context.lessonFactory.create(5, {
                course: await context.courseFactory.createOne({language: language, isPublic: true}),
                audio: ""
            }));
            lessons = shuffleArray(lessons);
            for (let i = 0; i < faker.datatype.number({min: 1, max: lessons.length}); i++)
                await context.em.create(MapLearnerLesson, {learner: user.profile, lesson: lessons[i]});

            const response = await makeRequest("me", {hasAudio: false}, session.token);

            const userLessons = await context.lessonRepo.find({
                learners: user.profile,
                audio: "",
                course: {isPublic: true}
            }, {populate: ["course", "course.language", "course.addedBy.user"]});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(userLessons));
        });
        test<LocalTestContext>("If hasAudio is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const response = await makeRequest("me", {hasAudio: "maybe?"}, session.token);
            expect(response.statusCode).to.equal(400);
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
});

/**@link LessonController#addLessonToUserLearning*/
describe("POST users/:username/lessons", () => {
    const makeRequest = async (username: string | "me", body: object, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `users/${username}/lessons/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };
    describe("If the lesson exists and is public and user is learning lesson language add lesson to user's lessons learning", () => {
        test<LocalTestContext>("If username is me", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const course = await context.courseFactory.createOne({language, isPublic: true});
            const lesson = await context.lessonFactory.createOne({course});

            const response = await makeRequest("me", {lessonId: lesson.id}, session.token);
            await context.lessonRepo.annotateVocabsByLevel([lesson], user.id);
            await context.courseRepo.annotateVocabsByLevel([lesson.course], user.id);

            expect(response.statusCode).to.equal(201);
            expect(response.json()).toEqual(lessonSerializer.serialize(lesson));
            expect(await context.em.findOne(MapLearnerLesson, {learner: user.profile, lesson})).not.toBeNull();
        });
        test<LocalTestContext>("If username is belongs to the current user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const course = await context.courseFactory.createOne({language, isPublic: true});
            const lesson = await context.lessonFactory.createOne({course});

            const response = await makeRequest(user.username, {lessonId: lesson.id}, session.token);
            await context.lessonRepo.annotateVocabsByLevel([lesson], user.id);
            await context.courseRepo.annotateVocabsByLevel([lesson.course], user.id);

            expect(response.statusCode).to.equal(201);
            expect(response.json()).toEqual(lessonSerializer.serialize(lesson));
            expect(await context.em.findOne(MapLearnerLesson, {learner: user.profile, lesson})).not.toBeNull();
        });
    });
    test<LocalTestContext>("If user is already learning lesson return 200", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const course = await context.courseFactory.createOne({language, isPublic: true});
        const lesson = await context.lessonFactory.createOne({course, learners: user.profile});

        const response = await makeRequest("me", {lessonId: lesson.id}, session.token);
        await context.lessonRepo.annotateVocabsByLevel([lesson], user.id);
        await context.courseRepo.annotateVocabsByLevel([lesson.course], user.id);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(lessonSerializer.serialize(lesson));
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