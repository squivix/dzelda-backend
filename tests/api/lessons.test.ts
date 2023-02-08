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
import {buildQueryString, fetchRequest, fetchWithFiles} from "@/tests/api/utils.js";
import {lessonSerializer} from "@/src/schemas/response/serializers/LessonSerializer.js";
import {faker} from "@faker-js/faker";
import {randomCase, randomEnum} from "@/tests/utils.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {EntityRepository} from "@mikro-orm/core";
import {parsers} from "@/src/utils/parsers/parsers.js";
import {MapLessonVocab} from "@/src/models/entities/MapLessonVocab.js";

interface LocalTestContext extends TestContext {
    userFactory: UserFactory;
    profileFactory: ProfileFactory;
    sessionFactory: SessionFactory;
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
        await context.lessonFactory.create(10, {course: await context.courseFactory.createOne({isPublic: false})});
        await context.lessonFactory.create(10, {course: await context.courseFactory.createOne({isPublic: true})});

        const response = await makeRequest();

        const lessons = await context.lessonRepo.find({course: {isPublic: true}}, {populate: ["course", "course.addedBy.user"]});
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
    });
    describe("test languageCode filter", () => {
        test<LocalTestContext>("If language filter is valid and language exists only return public lessons in that language", async (context) => {
            const language = await context.languageFactory.createOne();
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({language: language})});
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({})});

            const response = await makeRequest({languageCode: language.code});

            const lessons = await context.lessonRepo.find({
                course: {
                    language: language,
                    isPublic: true
                }
            }, {populate: ["course", "course.addedBy.user"]});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
        });
        test<LocalTestContext>("If language does not exist return empty lessons list", async (context) => {
            const language = await context.languageFactory.createOne();
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({language: language})});
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({})});

            const response = await makeRequest({languageCode: faker.random.alpha({count: 4})});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual([]);
        });
        test<LocalTestContext>("If language filter is invalid return 400", async (context) => {
            const language = await context.languageFactory.createOne();
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({language: language})});
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({})});

            const response = await makeRequest({languageCode: 12345});

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test addedBy filter", () => {
        test<LocalTestContext>("If addedBy filter is valid and user exists only return public lessons added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({addedBy: user.profile})});
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({})});

            const response = await makeRequest({addedBy: user.username});

            const lessons = await context.lessonRepo.find({
                course: {
                    addedBy: user.profile,
                    isPublic: true
                }
            }, {populate: ["course", "course.addedBy.user"]});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
        });
        test<LocalTestContext>("If addedBy is me and signed in return lessons added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({addedBy: user.profile})});
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({})});

            const response = await makeRequest({addedBy: "me"}, session.token);

            let lessons = await context.lessonRepo.find({
                course: {addedBy: user.profile}
            }, {populate: ["course", "course.addedBy.user"]});
            lessons = await context.lessonRepo.annotateVocabsByLevel(lessons, user.id);
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
        });
        test<LocalTestContext>("If addedBy is me and not signed in return 401", async (context) => {
            await context.lessonFactory.create(10, {course: await context.courseFactory.createOne()});

            const response = await makeRequest({addedBy: "me"});

            expect(response.statusCode).to.equal(401);
        });
        test<LocalTestContext>("If user does not exist return empty course list", async (context) => {
            await context.lessonFactory.create(10, {course: await context.courseFactory.createOne()});

            const response = await makeRequest({addedBy: faker.random.alpha({count: 20})});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual([]);
        });
        test<LocalTestContext>("If addedBy filter is invalid return 400", async (context) => {
            await context.courseFactory.create(10);

            const response = await makeRequest({addedBy: "!@#%#%^#^!"});
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test searchQuery filter", () => {
        test<LocalTestContext>("If searchQuery is valid return lessons with query in title", async (context) => {
            const courses = await context.courseFactory.create(3);
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
            }, {populate: ["course", "course.addedBy.user"]});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
        });
        test<LocalTestContext>("If searchQuery is invalid return 400", async (context) => {
            await context.lessonFactory.create(10, {course: await context.courseFactory.createOne()});

            const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})});

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If no lessons match search query return empty list", async (context) => {
            await context.lessonFactory.create(10, {course: await context.courseFactory.createOne()});

            const response = await makeRequest({searchQuery: faker.random.alpha({count: 200})});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual([]);
        });
    });
    describe("test level filter", () => {
        test<LocalTestContext>("If the level is valid return courses in that level", async (context) => {
            const level = randomEnum(LanguageLevel);
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({level: level})});
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({})});

            const response = await makeRequest({level: level});

            const lessons = await context.lessonRepo.find({
                course: {
                    level: level,
                    isPublic: true
                }
            }, {populate: ["course", "course.addedBy.user"]});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
        });
        test<LocalTestContext>("If the level is invalid return 400", async (context) => {
            await context.lessonFactory.create(10, {course: await context.courseFactory.createOne({isPublic: true})});

            const response = await makeRequest({level: "hard"});

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test hasAudio filter", () => {
        test<LocalTestContext>("If hasAudio is true return lessons with audio", async (context) => {
            await context.lessonFactory.create(5, {
                course: await context.courseFactory.createOne({isPublic: true}),
                audio: "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg"
            });
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({isPublic: true}), audio: ""});

            const response = await makeRequest({hasAudio: true});

            let lessons = await context.lessonRepo.find({
                audio: {$ne: ""},
                course: {isPublic: true}
            }, {populate: ["course", "course.addedBy.user"]});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
        });
        test<LocalTestContext>("If hasAudio is false return lessons with no audio", async (context) => {
            await context.lessonFactory.create(5, {
                course: await context.courseFactory.createOne({isPublic: true}),
                audio: "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg"
            });
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne({isPublic: true}), audio: ""});

            const response = await makeRequest({hasAudio: false});

            let lessons = await context.lessonRepo.find({
                audio: "",
                course: {isPublic: true}
            }, {populate: ["course", "course.addedBy.user"]});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
        });
        test<LocalTestContext>("If hasAudio is invalid return 400", async (context) => {
            await context.lessonFactory.create(5, {
                course: await context.courseFactory.createOne(),
                audio: "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg"
            });
            await context.lessonFactory.create(5, {course: await context.courseFactory.createOne(), audio: ""});

            const response = await makeRequest({hasAudio: "maybe?"});
            expect(response.statusCode).to.equal(400);
        });
    });
    test<LocalTestContext>("If logged in return lessons with vocab levels for user", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        await context.lessonFactory.create(10, {course: await context.courseFactory.createOne({isPublic: false})});
        await context.lessonFactory.create(10, {course: await context.courseFactory.createOne({isPublic: true})});

        const response = await makeRequest({}, session.token);

        let lessons = await context.lessonRepo.find({course: {isPublic: true}}, {populate: ["course", "course.addedBy.user"]});
        lessons = await context.lessonRepo.annotateVocabsByLevel(lessons, user.id);
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
    });
    test<LocalTestContext>("If logged in as author of lesson courses return private lessons", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        await context.lessonFactory.create(10, {course: await context.courseFactory.createOne({isPublic: false, addedBy: user.profile})});
        await context.lessonFactory.create(10, {course: await context.courseFactory.createOne({isPublic: true})});

        const response = await makeRequest({}, session.token);

        let lessons = await context.lessonRepo.find({$or: [{course: {isPublic: true}}, {course: {addedBy: user.profile}}]}, {populate: ["course", "course.addedBy.user"]});
        lessons = await context.lessonRepo.annotateVocabsByLevel(lessons, user.id);
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(lessonSerializer.serializeList(lessons));
    });
});

/**@link LessonController#createLesson*/
describe("POST lessons/", () => {
    const makeRequest = async ({data, files = {}}: {
        data: object; files?: { [key: string]: { value: string | Buffer; fileName: string, mimeType?: string, fallbackType?: "image" | "audio" } | "" }
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


    describe("If all fields are valid a new course should be created and return 201", () => {
        test<LocalTestContext>("If optional fields are missing use default values", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const course = await context.courseFactory.createOne({addedBy: user.profile, lessons: []});
            let newLesson: Lesson | null = context.lessonFactory.makeOne({course: course});

            const response = await makeRequest({
                data: {
                    title: newLesson.title,
                    text: newLesson.text,
                    courseId: course.id,
                }
            }, session.token);

            expect(response.statusCode).to.equal(201);
            newLesson = await context.lessonRepo.findOne({course: course}, {populate: ["course", "course.addedBy.user"]});
            expect(newLesson).not.toBeNull();
            if (!newLesson) return;
            await context.lessonRepo.annotateVocabsByLevel([newLesson], user.id);
            await context.courseRepo.annotateVocabsByLevel([newLesson.course], user.id);
            expect(response.json()).toEqual(expect.objectContaining(lessonSerializer.serialize(newLesson)));

            const parser = parsers["en"];
            const lessonWordsText = parser.parseText(newLesson.text);
            const lessonVocabs = await context.vocabRepo.find({text: lessonWordsText, language: course.language});
            const lessonVocabMappings = await context.em.find(MapLessonVocab, {vocab: lessonVocabs, lesson: newLesson});

            expect(lessonVocabs.length).toEqual(lessonWordsText.length);
            expect(lessonVocabMappings.length).toEqual(lessonWordsText.length);
        });
        test<LocalTestContext>("If optional fields are provided use provided values", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const course = await context.courseFactory.createOne({addedBy: user.profile, lessons: []});
            let newLesson: Lesson | null = context.lessonFactory.makeOne({course: course});

            const response = await makeRequest({
                data: {
                    title: newLesson.title,
                    text: newLesson.text,
                    courseId: course.id,
                }, files: {
                    image: {value: newLesson.image, fallbackType: "image", fileName: "lesson-image"},
                    audio: {value: newLesson.audio, fallbackType: "audio", fileName: "lesson-audio"},
                }
            }, session.token);

            expect(response.statusCode).to.equal(201);
            newLesson = await context.lessonRepo.findOne({course: course}, {populate: ["course", "course.addedBy.user"]});
            expect(newLesson).not.toBeNull();
            if (!newLesson) return;
            await context.lessonRepo.annotateVocabsByLevel([newLesson], user.id);
            await context.courseRepo.annotateVocabsByLevel([newLesson.course], user.id);
            expect(response.json()).toEqual(expect.objectContaining(lessonSerializer.serialize(newLesson)));

            const parser = parsers["en"];
            const lessonWordsText = parser.parseText(newLesson.text);
            const lessonVocabs = await context.vocabRepo.find({text: lessonWordsText, language: course.language});
            const lessonVocabMappings = await context.em.find(MapLessonVocab, {vocab: lessonVocabs, lesson: newLesson});

            expect(lessonVocabs.length).toEqual(lessonWordsText.length);
            expect(lessonVocabMappings.length).toEqual(lessonWordsText.length);
        });
    });
    test<LocalTestContext>("If user not logged in return 401", async (context) => {
        const course = await context.courseFactory.createOne();
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
    });
    describe("If fields are invalid return 4xx code", async () => {
    });
});