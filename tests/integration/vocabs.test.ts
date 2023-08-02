import {beforeEach, describe, expect, test, TestContext, vi} from "vitest";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";
import {LanguageFactory} from "@/src/seeders/factories/LanguageFactory.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {orm} from "@/src/server.js";
import {InjectOptions} from "light-my-request";
import {buildQueryString, createComparator, fetchRequest} from "@/tests/integration/utils.js";
import {VocabFactory} from "@/src/seeders/factories/VocabFactory.js";
import {vocabSerializer} from "@/src/presentation/response/serializers/entities/VocabSerializer.js";
import {faker} from "@faker-js/faker";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {VocabRepo} from "@/src/models/repos/VocabRepo.js";
import {randomCase, randomEnum} from "@/tests/utils.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {learnerVocabSerializer} from "@/src/presentation/response/serializers/mappings/LearnerVocabSerializer.js";
import {LessonFactory} from "@/src/seeders/factories/LessonFactory.js";
import {CourseFactory} from "@/src/seeders/factories/CourseFactory.js";
import * as parserExports from "@/src/utils/parsers/parsers.js";
import {MeaningFactory} from "@/src/seeders/factories/MeaningFactory.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";
import {Meaning} from "@/src/models/entities/Meaning.js";

interface LocalTestContext extends TestContext {
    languageFactory: LanguageFactory;
    vocabFactory: VocabFactory;
    vocabRepo: VocabRepo;
    lessonFactory: LessonFactory;
    courseFactory: CourseFactory;
    meaningFactory: MeaningFactory;
}

beforeEach<LocalTestContext>(async (context) => {
    await orm.getSchemaGenerator().clearDatabase();
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.profileFactory = new ProfileFactory(context.em);
    context.sessionFactory = new SessionFactory(context.em);
    context.languageFactory = new LanguageFactory(context.em);
    context.vocabFactory = new VocabFactory(context.em);
    context.lessonFactory = new LessonFactory(context.em);
    context.courseFactory = new CourseFactory(context.em);
    context.meaningFactory = new MeaningFactory(context.em);

    context.vocabRepo = context.em.getRepository(Vocab);
});

/**{@link VocabController#getVocabs}*/
describe("GET vocabs/", () => {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `vocabs/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const queryDefaults = {pagination: {pageSize: 25, page: 1}};
    const defaultSortComparator = createComparator(Vocab, [
        {property: "text", order: "asc"},
        {property: "id", order: "asc"}]
    );
    test<LocalTestContext>("If there are no filters return all vocabs paginated", async (context) => {
        const language = await context.languageFactory.createOne();
        const expectedVocabs = await context.vocabFactory.create(5, {language});
        expectedVocabs.sort(defaultSortComparator);
        const response = await makeRequest({});
        const recordsCount = expectedVocabs.length;

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: vocabSerializer.serializeList(expectedVocabs)
        });
    });
    describe("test filters", () => {
        describe("test languageCode filter", () => {
            test<LocalTestContext>("If language filter is valid and language exists only return vocabs in that language", async (context) => {
                const language1 = await context.languageFactory.createOne();
                const language2 = await context.languageFactory.createOne();
                const expectedVocabs = await context.vocabFactory.create(3, {language: language1});
                await context.vocabFactory.create(3, {language: language2});
                expectedVocabs.sort(defaultSortComparator);

                const response = await makeRequest({languageCode: language1.code});
                const recordsCount = expectedVocabs.length;
                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
            });
            test<LocalTestContext>("If language does not exist return empty vocab list", async (context) => {
                const language = await context.languageFactory.makeOne();
                await context.vocabFactory.create(3, {language: await context.languageFactory.createOne()});

                const response = await makeRequest({languageCode: language.code});

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
        describe("test searchQuery filter", () => {
            test<LocalTestContext>("If searchQuery is valid return vocabs with text that matches query", async (context) => {
                const language = await context.languageFactory.createOne();
                const searchQuery = "search query";
                const expectedVocabs: Vocab[] = [];
                for (let i = 0; i < 3; i++) {
                    expectedVocabs.push(context.vocabFactory.makeOne({
                        language: language,
                        text: `text ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`,
                    }));
                }
                await context.em.persistAndFlush(expectedVocabs);
                expectedVocabs.sort(defaultSortComparator);
                await context.vocabFactory.create(3, {language: language});
                const response = await makeRequest({searchQuery: searchQuery});

                const recordsCount = expectedVocabs.length;
                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
            })
            ;
            test<LocalTestContext>("If no vocabs match search query return empty list", async (context) => {
                await context.vocabFactory.create(5, {language: await context.languageFactory.createOne()});

                const response = await makeRequest({searchQuery: faker.random.alpha({count: 200})});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: 0,
                    data: []
                });
            });
            test<LocalTestContext>("If searchQuery is invalid return 400", async (context) => {
                const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})});

                expect(response.statusCode).to.equal(400);
            });
        });
    });
    describe("test sort", () => {
        describe("test sortBy", () => {
            test<LocalTestContext>("test sortBy title", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedVocabs = [
                    await context.vocabFactory.createOne({text: "abc", language}),
                    await context.vocabFactory.createOne({text: "def", language}),
                ];
                const response = await makeRequest({sortBy: "text"});

                const recordsCount = expectedVocabs.length;

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
            });
            test<LocalTestContext>("test sortBy learnersCount", async (context) => {
                const learner1 = await context.userFactory.createOne();
                const learner2 = await context.userFactory.createOne();
                const language = await context.languageFactory.createOne();
                const expectedVocabs = [
                    await context.vocabFactory.createOne({language, learners: [learner1.profile]}),
                    await context.vocabFactory.createOne({language, learners: [learner1.profile, learner2.profile]})
                ];

                const response = await makeRequest({sortBy: "learnersCount"});
                const recordsCount = expectedVocabs.length;

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
            });
            test<LocalTestContext>("test sortBy lessonsCount", async (context) => {
                const course = await context.courseFactory.createOne({language: await context.languageFactory.createOne()});
                const lesson1 = await context.lessonFactory.createOne({course});
                const lesson2 = await context.lessonFactory.createOne({course});
                const language = await context.languageFactory.createOne();
                const expectedVocabs = [
                    await context.vocabFactory.createOne({language, lessonsAppearingIn: [lesson1]}),
                    await context.vocabFactory.createOne({language, lessonsAppearingIn: [lesson1, lesson2]}),
                ];
                const response = await makeRequest({sortBy: "lessonsCount"});

                const recordsCount = expectedVocabs.length;

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
            });
            test<LocalTestContext>("If sortBy is invalid return 400", async (context) => {
                const response = await makeRequest({sortBy: "popularity"});
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<LocalTestContext>("If sortOrder is asc return the vocabs in ascending order", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedVocabs = [
                    await context.vocabFactory.createOne({text: "abc", language}),
                    await context.vocabFactory.createOne({text: "def", language}),
                ];
                const response = await makeRequest({sortOrder: "asc"});

                const recordsCount = expectedVocabs.length;

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
            });
            test<LocalTestContext>("If sortOrder is desc return the vocabs in descending order", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedVocabs = [
                    await context.vocabFactory.createOne({text: "def", language}),
                    await context.vocabFactory.createOne({text: "abc", language}),
                ];
                const response = await makeRequest({sortOrder: "desc"});

                const recordsCount = expectedVocabs.length;

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
            });
            test<LocalTestContext>("If sortOrder is invalid return 400", async (context) => {
                const response = await makeRequest({sortOrder: "rising"});
                expect(response.statusCode).to.equal(400);
            });
        });
    });
    describe("test pagination", () => {
        describe("test page", () => {
            test<LocalTestContext>("If page is 1 return the first page of results", async (context) => {
                const language = await context.languageFactory.createOne();
                const allVocabs = await context.vocabFactory.create(20, {language});
                allVocabs.sort(defaultSortComparator);
                const recordsCount = allVocabs.length;
                const page = 1, pageSize = 3;
                const expectedVocabs = allVocabs.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
                expect(response.json().data.length).toBeLessThanOrEqual(pageSize);
            });
            test<LocalTestContext>("If page is 2 return the second page of results", async (context) => {
                const language = await context.languageFactory.createOne();
                const allVocabs = await context.vocabFactory.create(20, {language});
                allVocabs.sort(defaultSortComparator);
                const recordsCount = allVocabs.length;
                const page = 2, pageSize = 3;
                const expectedVocabs = allVocabs.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
                expect(response.json().data.length).toBeLessThanOrEqual(pageSize);
            });
            test<LocalTestContext>("If page is last return the last page of results", async (context) => {
                const language = await context.languageFactory.createOne();
                const allVocabs = await context.vocabFactory.create(20, {language});
                allVocabs.sort(defaultSortComparator);
                const recordsCount = allVocabs.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedVocabs = allVocabs.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
                expect(response.json().data.length).toBeLessThanOrEqual(pageSize);
            });
            test<LocalTestContext>("If page is more than last return empty page", async (context) => {
                const language = await context.languageFactory.createOne();
                const allVocabs = await context.vocabFactory.create(20, {language});
                allVocabs.sort(defaultSortComparator);
                const recordsCount = allVocabs.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize) + 1;

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
            test<LocalTestContext>("If pageSize is valid split the results into pageSize sized pages", async (context) => {
                const language = await context.languageFactory.createOne();
                const allVocabs = await context.vocabFactory.create(25, {language});
                allVocabs.sort(defaultSortComparator);
                const recordsCount = allVocabs.length;
                const pageSize = 10;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedVocabs = allVocabs.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: vocabSerializer.serializeList(expectedVocabs)
                });
                expect(response.json().data.length).toBeLessThanOrEqual(pageSize);
            });
            describe("If pageSize is invalid return 400", () => {
                test<LocalTestContext>("If pageSize is too big return 400", async (context) => {
                    const response = await makeRequest({page: 1, pageSize: 500});

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If pageSize is negative return 400", async (context) => {
                    const response = await makeRequest({page: 1, pageSize: -10});

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If pageSize is not a number return 400", async (context) => {
                    const response = await makeRequest({page: 1, pageSize: "a lot"});

                    expect(response.statusCode).to.equal(400);
                });
            });
        });
    });
});

/**{@link VocabController#createVocab}*/
describe("POST vocabs/", () => {
    const makeRequest = async (body: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `vocabs/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };

    test<LocalTestContext>("If user is logged in and all fields are valid create a new vocab and return it", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        vi.spyOn(parserExports, "getParser").mockImplementation((_) => parserExports.parsers["en"]);
        const newVocab = context.vocabFactory.makeOne({language: language});
        const response = await makeRequest({
            languageCode: language.code,
            text: newVocab.text,
            isPhrase: newVocab.isPhrase
        }, session.token);

        expect(response.statusCode).toEqual(201);
        expect(response.json()).toEqual(expect.objectContaining(vocabSerializer.serialize(newVocab)));
        expect(await context.vocabRepo.findOne({text: newVocab.text, isPhrase: newVocab.isPhrase, language})).not.toBeNull();
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const language = await context.languageFactory.createOne();
        const newVocab = context.vocabFactory.makeOne({language: language});
        const response = await makeRequest({
            languageCode: language.code,
            text: newVocab.text,
            isPhrase: newVocab.isPhrase
        });

        expect(response.statusCode).toEqual(401);
    });
    describe("If fields are missing return 400", async () => {
        test<LocalTestContext>("If languageCode is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newVocab = context.vocabFactory.makeOne({language: language});
            const response = await makeRequest({
                text: newVocab.text,
                isPhrase: newVocab.isPhrase
            }, session.token);

            expect(response.statusCode).toEqual(400);
        });
        test<LocalTestContext>("If text is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newVocab = context.vocabFactory.makeOne({language: language});
            const response = await makeRequest({
                languageCode: language.code,
                isPhrase: newVocab.isPhrase
            }, session.token);

            expect(response.statusCode).toEqual(400);
        });
        test<LocalTestContext>("If isPhrase is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newVocab = context.vocabFactory.makeOne({language: language});
            const response = await makeRequest({
                languageCode: language.code,
                text: newVocab.text,
            }, session.token);

            expect(response.statusCode).toEqual(400);
        });
    });
    describe("If fields are invalid return 400", async () => {
        describe("If language is invalid return 400", async () => {
            test<LocalTestContext>("If languageCode is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newVocab = context.vocabFactory.makeOne({language: language});
                const response = await makeRequest({
                    languageCode: faker.random.alphaNumeric(10),
                    text: newVocab.text,
                    isPhrase: newVocab.isPhrase
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
            test<LocalTestContext>("If language does not exist return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newVocab = context.vocabFactory.makeOne({language: language});
                const response = await makeRequest({
                    languageCode: faker.random.alphaNumeric(2),
                    text: newVocab.text,
                    isPhrase: newVocab.isPhrase
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
            test<LocalTestContext>("If language is not supported return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne({isSupported: false});
                const newVocab = context.vocabFactory.makeOne({language: language});
                const response = await makeRequest({
                    languageCode: language.code,
                    text: newVocab.text,
                    isPhrase: newVocab.isPhrase
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
        });
        describe("If text is invalid return 400", async () => {
            test<LocalTestContext>("If text contains no parsable words return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                vi.spyOn(parserExports, "getParser").mockImplementation((_) => parserExports.parsers["en"]);
                const newVocab = context.vocabFactory.makeOne({language: language});
                const response = await makeRequest({
                    languageCode: language.code,
                    text: faker.random.numeric(5),
                    isPhrase: newVocab.isPhrase
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
            test<LocalTestContext>("If text contains more than one parsable words and isPhrase is false return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                vi.spyOn(parserExports, "getParser").mockImplementation((_) => parserExports.parsers["en"]);
                const response = await makeRequest({
                    languageCode: language.code,
                    text: faker.random.words(2),
                    isPhrase: false
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
            test<LocalTestContext>("If text is longer than 255 characters return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newVocab = context.vocabFactory.makeOne({language: language});
                const response = await makeRequest({
                    languageCode: language.code,
                    text: faker.random.alpha(300),
                    isPhrase: newVocab.isPhrase
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
        });
        test<LocalTestContext>("If isPhrase is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newVocab = context.vocabFactory.makeOne({language: language});
            const response = await makeRequest({
                languageCode: language.code,
                text: newVocab.text,
                isPhrase: "kinda?"
            }, session.token);

            expect(response.statusCode).toEqual(400);
        });
    });
    test<LocalTestContext>("If vocab with same text already exists for the language return 200", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const oldVocab = await context.vocabFactory.createOne({language: language});
        const newVocab = context.vocabFactory.makeOne({language: language, text: oldVocab.text});
        vi.spyOn(parserExports, "getParser").mockImplementation((_) => parserExports.parsers["en"]);
        const response = await makeRequest({
            languageCode: language.code,
            text: newVocab.text,
            isPhrase: newVocab.isPhrase
        }, session.token);

        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual(vocabSerializer.serialize(oldVocab));
    });
});

/**{@link VocabController#getUserVocabs}*/
describe("GET users/:username/vocabs/", () => {
    const makeRequest = async (username: string | "me", queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/${username}/vocabs/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const queryDefaults = {pagination: {pageSize: 25, page: 1}};
    const defaultSortComparator = createComparator(Vocab, [
        {property: "text", order: "asc"},
        {property: "id", order: "asc"}]
    );
    describe("If user is logged in and there are no filters return vocabs the user is learning", () => {
        test<LocalTestContext>("If username is me", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            await context.vocabFactory.create(5, {language});
            const expectedVocabs = await context.vocabFactory.create(5, {language});
            expectedVocabs.sort(defaultSortComparator);
            const expectedMappings = [];
            for (let vocab of expectedVocabs)
                expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
            await context.em.flush();
            const recordsCount = expectedMappings.length;

            const response = await makeRequest("me", {}, session.token);
            await context.em.count(MapLearnerVocab, {learner: user.profile});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: learnerVocabSerializer.serializeList(expectedMappings)
            });
        });
        test<LocalTestContext>("If username belongs to the currently logged in user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            await context.vocabFactory.create(3, {language});
            const expectedVocabs = await context.vocabFactory.create(3, {language});
            expectedVocabs.sort(defaultSortComparator);
            const expectedMappings = [];
            for (let vocab of expectedVocabs)
                expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
            await context.em.flush();
            const recordsCount = expectedMappings.length;

            const response = await makeRequest(user.username, {}, session.token);
            await context.em.count(MapLearnerVocab, {learner: user.profile});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: learnerVocabSerializer.serializeList(expectedMappings)
            });
        });
    });
    describe("test languageCode filter", () => {
        test<LocalTestContext>("If language filter is valid and language exists only return vocabs in that language the user is learning", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            const expectedVocabs = await context.vocabFactory.create(3, {language: language1});
            await context.vocabFactory.create(3, {language: language2, learners: user.profile});
            await context.vocabFactory.create(5, {language: language1});
            expectedVocabs.sort(defaultSortComparator);
            const expectedMappings = [];
            for (let vocab of expectedVocabs)
                expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
            await context.em.flush();
            const recordsCount = expectedMappings.length;

            const response = await makeRequest("me", {languageCode: language1.code}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: learnerVocabSerializer.serializeList(expectedMappings)
            });
        });
        test<LocalTestContext>("If language does not exist return empty vocab list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.makeOne();

            const response = await makeRequest("me", {languageCode: language.code}, session.token);

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
    describe("test level filter", () => {
        test<LocalTestContext>("If level filter is valid only return vocabs the user is learning with that level ", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const level = randomEnum(VocabLevel);
            const expectedVocabs = await context.vocabFactory.create(5, {language});
            for (let vocab of await context.vocabFactory.create(5, {language}))
                context.em.create(MapLearnerVocab, {learner: user.profile, vocab, level: randomEnum(VocabLevel, [level])});
            expectedVocabs.sort(defaultSortComparator);
            const expectedMappings = [];
            for (let vocab of expectedVocabs)
                expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab, level}));
            await context.em.flush();
            const recordsCount = expectedMappings.length;
            const response = await makeRequest("me", {level: level}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: learnerVocabSerializer.serializeList(expectedMappings)
            });
        });
        test<LocalTestContext>("If level filter is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});

            const response = await makeRequest("me", {level: 7}, session.token);

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test searchQuery filter", () => {
        test<LocalTestContext>("If searchQuery is valid return vocabs with query in text", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const searchQuery = "search query";
            await context.vocabFactory.create(5, {language: language, learners: user.profile});
            const expectedVocabs: Vocab[] = await context.vocabFactory.each(v => v.text = `text ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`).create(5, {language});
            expectedVocabs.sort(defaultSortComparator);
            const expectedMappings = [];
            for (let vocab of expectedVocabs)
                expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
            await context.em.flush();
            const recordsCount = expectedMappings.length;

            const response = await makeRequest("me", {searchQuery: searchQuery}, session.token);
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: learnerVocabSerializer.serializeList(expectedMappings)
            });
        });
        test<LocalTestContext>("If searchQuery is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});

            const response = await makeRequest("me", {searchQuery: faker.random.alpha({count: 300})}, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If no vocabs match search query return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            await context.vocabFactory.create(5, {language: language, learners: user.profile});

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
    describe("test sort", () => {
        describe("test sortBy", () => {
            test<LocalTestContext>("test sortBy text", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedVocabs = [
                    await context.vocabFactory.createOne({text: "abc", language}),
                    await context.vocabFactory.createOne({text: "def", language}),
                ];
                await context.vocabFactory.createOne({language});
                const expectedMappings = [];
                for (let vocab of expectedVocabs)
                    expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                const recordsCount = expectedMappings.length;

                const response = await makeRequest("me", {sortBy: "text"}, session.token);


                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: learnerVocabSerializer.serializeList(expectedMappings)
                });
            });
            test<LocalTestContext>("test sortBy learnersCount", async (context) => {
                const user = await context.userFactory.createOne();
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedVocabs = [
                    await context.vocabFactory.createOne({language, learners: [user1.profile]}),
                    await context.vocabFactory.createOne({language, learners: [user1.profile, user2.profile]})
                ];
                await context.vocabFactory.createOne({language});
                const expectedMappings = [];
                for (let vocab of expectedVocabs)
                    expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                const recordsCount = expectedMappings.length;


                const response = await makeRequest("me", {sortBy: "learnersCount"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: learnerVocabSerializer.serializeList(expectedMappings)
                });
            });
            test<LocalTestContext>("test sortBy lessonsCount", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const course = await context.courseFactory.createOne({language});
                const lesson1 = await context.lessonFactory.createOne({course});
                const lesson2 = await context.lessonFactory.createOne({course});

                const expectedVocabs = [
                    await context.vocabFactory.createOne({language, lessonsAppearingIn: [lesson1]}),
                    await context.vocabFactory.createOne({language, lessonsAppearingIn: [lesson1, lesson2]})
                ];
                await context.vocabFactory.createOne({language});
                const expectedMappings = [];
                for (let vocab of expectedVocabs)
                    expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                const recordsCount = expectedMappings.length;

                const response = await makeRequest("me", {sortBy: "lessonsCount"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: learnerVocabSerializer.serializeList(expectedMappings)
                });
            });
            test<LocalTestContext>("If sortBy is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const response = await makeRequest("me", {sortBy: "popularity"}, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<LocalTestContext>("If sortOrder is asc return the vocabs in ascending order", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedVocabs = [
                    await context.vocabFactory.createOne({language, text: "abc"}),
                    await context.vocabFactory.createOne({language, text: "def"})
                ];
                await context.vocabFactory.createOne({language});
                const expectedMappings = [];
                for (let vocab of expectedVocabs)
                    expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                const recordsCount = expectedMappings.length;

                const response = await makeRequest("me", {sortBy: "text", sortOrder: "asc"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: learnerVocabSerializer.serializeList(expectedMappings)
                });
            });
            test<LocalTestContext>("If sortOrder is desc return the vocabs in descending order", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedVocabs = [
                    await context.vocabFactory.createOne({language, text: "def"}),
                    await context.vocabFactory.createOne({language, text: "abc"}),
                ];
                await context.vocabFactory.createOne({language});
                const expectedMappings = [];
                for (let vocab of expectedVocabs)
                    expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                const recordsCount = expectedMappings.length;

                const response = await makeRequest("me", {sortBy: "text", sortOrder: "desc"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: learnerVocabSerializer.serializeList(expectedMappings)
                });
            });
            test<LocalTestContext>("If sortOrder is invalid return 400", async (context) => {
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
                const expectedVocabs = await context.vocabFactory.create(10, {language});
                await context.vocabFactory.create(10, {language});
                expectedVocabs.sort(defaultSortComparator);
                const allMappings = [];
                for (let vocab of expectedVocabs)
                    allMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                const recordsCount = allMappings.length;
                const page = 1, pageSize = 3;
                const expectedMappings = allMappings.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest("me", {page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: learnerVocabSerializer.serializeList(expectedMappings)
                });
            });
            test<LocalTestContext>("If page is 2 return the second page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedVocabs = await context.vocabFactory.create(10, {language});
                expectedVocabs.sort(defaultSortComparator);
                const allMappings = [];
                for (let vocab of expectedVocabs)
                    allMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                const recordsCount = allMappings.length;
                await context.vocabFactory.create(10, {language});
                const page = 2, pageSize = 3;
                const expectedMappings = allMappings.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest("me", {page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: learnerVocabSerializer.serializeList(expectedMappings)
                });
            });
            test<LocalTestContext>("If page is last return the last page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedVocabs = await context.vocabFactory.create(10, {language});
                await context.vocabFactory.create(10, {language});
                expectedVocabs.sort(defaultSortComparator);
                const allMappings = [];
                for (let vocab of expectedVocabs)
                    allMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                const recordsCount = allMappings.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedMappings = allMappings.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest("me", {page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: learnerVocabSerializer.serializeList(expectedMappings)
                });
            });
            test<LocalTestContext>("If page is more than last return empty page", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedVocabs = await context.vocabFactory.create(10, {language});
                await context.vocabFactory.create(10, {language});
                expectedVocabs.sort(defaultSortComparator);
                const expectedMappings = [];
                for (let vocab of expectedVocabs)
                    expectedMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                const recordsCount = expectedMappings.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize) + 1;

                const response = await makeRequest("me", {page, pageSize}, session.token);

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
            test<LocalTestContext>("If pageSize is 10 split the results into 10 sized pages", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const expectedVocabs = await context.vocabFactory.create(10, {language});
                await context.vocabFactory.create(10, {language});
                expectedVocabs.sort(defaultSortComparator);
                const allMappings = [];
                for (let vocab of expectedVocabs)
                    allMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                const recordsCount = allMappings.length;
                const page = 1, pageSize = 10;
                const expectedMappings = allMappings.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest("me", {page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: learnerVocabSerializer.serializeList(expectedMappings)
                });
            });
            describe("If pageSize is invalid return 400", () => {
                test<LocalTestContext>("If pageSize is too big return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest("me", {page: 1, pageSize: 500}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If pageSize is negative return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const response = await makeRequest("me", {page: 1, pageSize: -10}, session.token);

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
    test<LocalTestContext>("If username is not logged in return 401", async (context) => {
        const response = await makeRequest("me", {});
        expect(response.statusCode).to.equal(401);
    });
});

/**{@link VocabController#addVocabToUser}*/
describe("POST users/:username/vocabs/", () => {
    const makeRequest = async (username: string | "me", body: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `users/${username}/vocabs/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };

    describe("If the vocab exists and user is learning vocab language add vocab to user's vocabs learning", () => {
        test<LocalTestContext>("If username is me", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const vocab = await context.vocabFactory.createOne({language});
            const expectedMapping = context.em.create(MapLearnerVocab, {learner: user.profile, vocab}, {persist: false});

            const response = await makeRequest("me", {vocabId: vocab.id}, session.token);

            expect(response.statusCode).to.equal(201);
            expect(response.json()).toEqual(learnerVocabSerializer.serialize(expectedMapping));
            const dbRecord = await context.em.findOne(MapLearnerVocab, {learner: user.profile, vocab});
            expect(dbRecord).not.toBeNull();
            if (dbRecord != null) {
                expect(learnerVocabSerializer.serialize(dbRecord)).toEqual(learnerVocabSerializer.serialize(expectedMapping));
            }
        });
        test<LocalTestContext>("If username is belongs to the current user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const vocab = await context.vocabFactory.createOne({language});
            const expectedMapping = context.em.create(MapLearnerVocab, {learner: user.profile, vocab}, {persist: false});

            const response = await makeRequest(user.username, {vocabId: vocab.id}, session.token);

            expect(response.statusCode).to.equal(201);
            expect(response.json()).toEqual(learnerVocabSerializer.serialize(expectedMapping));
            const dbRecord = await context.em.findOne(MapLearnerVocab, {learner: user.profile, vocab});
            expect(dbRecord).not.toBeNull();
            if (dbRecord != null) {
                expect(learnerVocabSerializer.serialize(dbRecord)).toEqual(learnerVocabSerializer.serialize(expectedMapping));
            }
        });
    });
    test<LocalTestContext>("If user is already learning vocab return 200", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language});
        const mapping = context.em.create(MapLearnerVocab, {learner: user.profile, vocab});
        await context.em.flush();

        const response = await makeRequest("me", {vocabId: vocab.id}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(learnerVocabSerializer.serialize(mapping));
    });
    describe("If required fields are missing return 400", function () {
        test<LocalTestContext>("If the vocabId is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const response = await makeRequest("me", {}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 400", function () {
        describe("If the vocab is invalid return 400", async () => {
            test<LocalTestContext>("If the vocabId is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest("me", {vocabId: faker.random.alpha(10)}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If the vocab is not found return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest("me", {vocabId: faker.datatype.number({min: 100000})}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If the vocab is not in a language the user is learning return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});

                const response = await makeRequest("me", {vocabId: vocab.id}, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language});

        const response = await makeRequest("me", {vocabId: vocab.id});
        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If username does not exist return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language});

        const response = await makeRequest(faker.random.alphaNumeric(20), {vocabId: vocab.id}, session.token);
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>(`If user exists and is not public and not authenticated as user return 404`, async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const otherUser = await context.userFactory.createOne({profile: {isPublic: false}});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language});

        const response = await makeRequest(otherUser.username, {vocabId: vocab.id}, session.token);
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>(`If username exists and is public and not authenticated as user return 403`, async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const otherUser = await context.userFactory.createOne({profile: {isPublic: true}});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language});

        const response = await makeRequest(otherUser.username, {vocabId: vocab.id}, session.token);
        expect(response.statusCode).to.equal(403);
    });

});

/**{@link VocabController#getUserVocab}*/
describe("GET users/:username/vocabs/:vocabId/", () => {
    const makeRequest = async (username: string | "me", vocabId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/${username}/vocabs/${vocabId}/`,
        };
        return await fetchRequest(options, authToken);
    };

    describe("If the vocab exists and user is learning it return user vocab", () => {
        test<LocalTestContext>("If username is me", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const vocab = await context.vocabFactory.createOne({language});
            const expectedMapping = context.em.create(MapLearnerVocab, {vocab, learner: user.profile});
            await context.em.flush();

            const response = await makeRequest("me", vocab.id, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(learnerVocabSerializer.serialize(expectedMapping));
        });
        test<LocalTestContext>("If username is belongs to the current user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const vocab = await context.vocabFactory.createOne({language});
            const expectedMapping = context.em.create(MapLearnerVocab, {vocab, learner: user.profile});
            await context.em.flush();

            const response = await makeRequest(user.username, vocab.id, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(learnerVocabSerializer.serialize(expectedMapping));
        });
    });
    test<LocalTestContext>(`If vocab does not exist return 404`, async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const response = await makeRequest("me", faker.datatype.number({min: 100000}), session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>(`If user is not learning vocab return 404`, async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language});

        const response = await makeRequest("me", vocab.id, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language, learners: user.profile});

        const response = await makeRequest("me", vocab.id);

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If username does not exist return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language, learners: user.profile});

        const response = await makeRequest(faker.random.alphaNumeric(20), vocab.id, session.token);
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>(`If user exists and is not public and not authenticated as user return 404`, async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const otherUser = await context.userFactory.createOne({profile: {isPublic: false}});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language, learners: otherUser.profile});

        const response = await makeRequest(otherUser.username, vocab.id, session.token);
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>(`If username exists and is public and not authenticated as user return 403`, async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const otherUser = await context.userFactory.createOne({profile: {isPublic: true}});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language, learners: otherUser.profile});

        const response = await makeRequest(otherUser.username, vocab.id, session.token);
        expect(response.statusCode).to.equal(403);
    });

});

/**{@link VocabController#updateUserVocab}*/
describe("PATCH users/:username/vocabs/:vocabId/", () => {
    const makeRequest = async (username: string | "me", vocabId: number | string, body: object, authToken?: string) => {
        const options: InjectOptions = {
            method: "PATCH",
            url: `users/${username}/vocabs/${vocabId}/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };
    const meaningSortComparator = createComparator(Meaning, [
        {property: "learnersCount", order: "asc"},
        {property: "text", order: "asc"},
        {property: "id", order: "asc"}]
    );
    describe("If all fields are valid, the vocab exists and user is learning it update user vocab", () => {
        test<LocalTestContext>("If username is me", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const vocab = await context.vocabFactory.createOne({language, learners: user.profile});
            const updatedMapping = context.em.create(MapLearnerVocab,
                {learner: user.profile, vocab, level: VocabLevel.LEVEL_3, notes: "Vocab note"}, {persist: false});

            const response = await makeRequest("me", vocab.id, {
                level: updatedMapping.level,
                notes: updatedMapping.notes
            }, session.token);

            const dbRecord = await context.em.findOneOrFail(MapLearnerVocab, {learner: user.profile, vocab});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(learnerVocabSerializer.serialize(updatedMapping));
            expect(learnerVocabSerializer.serialize(dbRecord)).toEqual(learnerVocabSerializer.serialize(updatedMapping));
        });
        test<LocalTestContext>("If username is belongs to the current user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const vocab = await context.vocabFactory.createOne({language, learners: user.profile});
            const updatedMapping = context.em.create(MapLearnerVocab,
                {learner: user.profile, vocab, level: VocabLevel.LEVEL_3, notes: "Vocab note"}, {persist: false});

            const response = await makeRequest(user.username, vocab.id, {
                level: updatedMapping.level,
                notes: updatedMapping.notes
            }, session.token);

            const dbRecord = await context.em.findOneOrFail(MapLearnerVocab, {learner: user.profile, vocab});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(learnerVocabSerializer.serialize(updatedMapping));
            expect(learnerVocabSerializer.serialize(dbRecord)).toEqual(learnerVocabSerializer.serialize(updatedMapping));
        });
        test<LocalTestContext>("If updated vocab level is ignored, delete all meanings saved by user for that vocab", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const vocab = await context.vocabFactory.createOne({
                language, learners: user.profile,
                meanings: context.meaningFactory.makeDefinitions(3, {learners: [user.profile], addedBy: user.profile, language}).sort(meaningSortComparator)
            });

            const updatedMapping = context.em.create(MapLearnerVocab,
                {learner: user.profile, vocab, level: VocabLevel.IGNORED, notes: ""}, {persist: false});
            updatedMapping.vocab.meanings.getItems().forEach(m => {
                m.learners.set([]);
                m.learnersCount = 0;
            });

            const response = await makeRequest("me", vocab.id, {
                level: updatedMapping.level,
                notes: updatedMapping.notes
            }, session.token);

            const dbRecord = await context.em.findOneOrFail(MapLearnerVocab, {learner: user.profile, vocab});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(learnerVocabSerializer.serialize(updatedMapping));
            expect(learnerVocabSerializer.serialize(dbRecord)).toEqual(learnerVocabSerializer.serialize(updatedMapping));
            expect(await context.em.find(MapLearnerMeaning, {learner: user.profile, meaning: {vocab: vocab}})).toEqual([]);
        });
    });
    describe(`If fields are invalid return 400`, async () => {
        test<LocalTestContext>("If level is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const vocab = await context.vocabFactory.createOne({language, learners: user.profile});

            const response = await makeRequest("me", vocab.id, {level: 7, notes: "Vocab note"}, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If notes are invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const vocab = await context.vocabFactory.createOne({language, learners: user.profile});

            const response = await makeRequest("me", vocab.id, {
                level: VocabLevel.LEVEL_3,
                notes: faker.random.alpha(3000)
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
    });
    test<LocalTestContext>(`If vocab does not exist return 404`, async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const response = await makeRequest("me", faker.datatype.number({min: 100000}), {level: VocabLevel.LEVEL_3}, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>(`If user is not learning vocab return 404`, async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language});

        const response = await makeRequest("me", vocab.id, {level: VocabLevel.LEVEL_3}, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language, learners: user.profile});

        const response = await makeRequest("me", vocab.id, {level: VocabLevel.LEVEL_3});

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If username does not exist return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language, learners: user.profile});

        const response = await makeRequest(faker.random.alphaNumeric(20), vocab.id, {level: VocabLevel.LEVEL_3}, session.token);
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>(`If user exists and is not public and not authenticated as user return 404`, async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const otherUser = await context.userFactory.createOne({profile: {isPublic: false}});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language, learners: otherUser.profile});

        const response = await makeRequest(otherUser.username, vocab.id, {level: VocabLevel.LEVEL_3}, session.token);
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>(`If username exists and is public and not authenticated as user return 403`, async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const otherUser = await context.userFactory.createOne({profile: {isPublic: true}});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language, learners: otherUser.profile});

        const response = await makeRequest(otherUser.username, vocab.id, {level: VocabLevel.LEVEL_3}, session.token);
        expect(response.statusCode).to.equal(403);
    });

});

/**{@link VocabController#getLessonVocabs}*/
describe("GET lessons/:lessonId/vocabs/", () => {
    const makeRequest = async (lessonId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `lessons/${lessonId}/vocabs/`
        };
        return await fetchRequest(options, authToken);
    };
    const defaultSortComparator = createComparator(Vocab, [
        {property: "text", order: "asc"},
        {property: "id", order: "asc"}]
    );
    test<LocalTestContext>("If user is logged in, lesson exists return vocabs in lesson", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({language, isPublic: true});
        const lesson = await context.lessonFactory.createOne({course, learners: user.profile});
        const expectedNewVocabs = await context.vocabFactory.create(3, {language, lessonsAppearingIn: lesson});
        const expectedExistingVocabs = await context.vocabFactory.create(3, {language, lessonsAppearingIn: lesson});
        const expectedExistingMappings = [];
        for (let vocab of expectedExistingVocabs)
            expectedExistingMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
        await context.em.flush();
        const expectedLessonVocabs = [...expectedExistingMappings, ...expectedNewVocabs];
        await context.vocabFactory.create(10, {language});
        const response = await makeRequest(lesson.id, session.token);

        expect(response.statusCode).to.equal(200);
        const responseBody = response.json();
        const expectedBody = learnerVocabSerializer.serializeList(expectedLessonVocabs);
        //ignore order
        expect(responseBody.length).toEqual(expectedBody.length);
        expect(responseBody).toEqual(expect.arrayContaining(expectedBody));

    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne({learners: user.profile});
        const course = await context.courseFactory.createOne({language});
        const lesson = await context.lessonFactory.createOne({course});

        const response = await makeRequest(lesson.id);

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If lesson does not exists return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});

        const response = await makeRequest(faker.datatype.number({min: 10000000}), session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If lesson is not public and user is not author return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({language, isPublic: false});
        const lesson = await context.lessonFactory.createOne({course});

        const response = await makeRequest(lesson.id, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If lesson is not public and user is author return lesson vocabs", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const course = await context.courseFactory.createOne({language, isPublic: false, addedBy: user.profile});
        const lesson = await context.lessonFactory.createOne({course, learners: user.profile});
        const expectedNewVocabs = await context.vocabFactory.create(3, {language, lessonsAppearingIn: lesson});
        const expectedExistingVocabs = await context.vocabFactory.create(3, {language, lessonsAppearingIn: lesson});
        const expectedExistingMappings = [];
        for (let vocab of expectedExistingVocabs)
            expectedExistingMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
        await context.em.flush();
        const expectedLessonVocabs = [...expectedExistingMappings, ...expectedNewVocabs];
        await context.vocabFactory.create(10, {language});
        const response = await makeRequest(lesson.id, session.token);

        expect(response.statusCode).to.equal(200);
        const responseBody = response.json();
        const expectedBody = learnerVocabSerializer.serializeList(expectedLessonVocabs);
        //ignore order
        expect(responseBody.length).toEqual(expectedBody.length);
        expect(responseBody).toEqual(expect.arrayContaining(expectedBody));
    });


});
