import {beforeEach, describe, expect, test, TestContext} from "vitest";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";
import {LanguageFactory} from "@/src/seeders/factories/LanguageFactory.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {orm} from "@/src/server.js";
import {InjectOptions} from "light-my-request";
import {buildQueryString, fetchRequest} from "@/tests/api/utils.js";
import {VocabFactory} from "@/src/seeders/factories/VocabFactory.js";
import {vocabSerializer} from "@/src/presentation/response/serializers/entities/VocabSerializer.js";
import {faker} from "@faker-js/faker";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {VocabRepo} from "@/src/models/repos/VocabRepo.js";
import {randomCase, randomEnum} from "@/tests/utils.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {learnerVocabSerializer} from "@/src/presentation/response/serializers/mappings/LearnerVocabSerializer.js";

interface LocalTestContext extends TestContext {
    languageFactory: LanguageFactory;
    vocabFactory: VocabFactory;
    vocabRepo: VocabRepo;
}

beforeEach<LocalTestContext>((context) => {
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.profileFactory = new ProfileFactory(context.em);
    context.sessionFactory = new SessionFactory(context.em);
    context.languageFactory = new LanguageFactory(context.em);
    context.vocabFactory = new VocabFactory(context.em);

    context.vocabRepo = context.em.getRepository(Vocab);
});
/**@link VocabController#createVocab*/
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
        const language = await context.languageFactory.createOne({code: "en"});
        const newVocab = context.vocabFactory.makeOne({language: language});
        const response = await makeRequest({
            languageCode: language.code,
            text: newVocab.text,
            isPhrase: newVocab.isPhrase
        }, session.token);

        expect(response.statusCode).toEqual(201);
        expect(response.json()).toEqual(expect.objectContaining(vocabSerializer.serialize(newVocab)));
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
                const language = await context.languageFactory.createOne({code: "en"});
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
                const language = await context.languageFactory.createOne({code: "en"});
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
        const language = await context.languageFactory.createOne({code: "en"});
        const oldVocab = await context.vocabFactory.createOne({language: language});
        const newVocab = context.vocabFactory.makeOne({language: language, text: oldVocab.text});
        const response = await makeRequest({
            languageCode: language.code,
            text: newVocab.text,
            isPhrase: newVocab.isPhrase
        }, session.token);

        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual(vocabSerializer.serialize(oldVocab));
    });
});

/**@link VocabController#getUserVocabs*/
describe("GET users/:username/vocabs/", () => {
    const makeRequest = async (username: string | "me", queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/${username}/vocabs/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };

    describe("If user is logged in and there are no filters return vocabs the user is learning", () => {
        test<LocalTestContext>("If username is me", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            await context.vocabFactory.create(10, {language, learners: user.profile});
            await context.vocabFactory.create(10, {language});

            const response = await makeRequest("me", {}, session.token);

            const mappings = await context.em.find(MapLearnerVocab, {learner: user.profile}, {populate: ["vocab", "vocab.language", "vocab.meanings"]});
            await context.vocabRepo.annotateUserMeanings(mappings, user.profile.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(learnerVocabSerializer.serializeList(mappings));
        });
        test<LocalTestContext>("If username belongs to the currently logged in user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            await context.vocabFactory.create(10, {language, learners: user.profile});
            await context.vocabFactory.create(10, {language});

            const response = await makeRequest(user.username, {}, session.token);

            const mappings = await context.em.find(MapLearnerVocab, {learner: user.profile}, {populate: ["vocab", "vocab.language", "vocab.meanings"]});
            await context.vocabRepo.annotateUserMeanings(mappings, user.profile.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(learnerVocabSerializer.serializeList(mappings));
        });
    });
    describe("test languageCode filter", () => {
        test<LocalTestContext>("If language filter is valid and language exists only return vocabs in that language the user is learning", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            await context.vocabFactory.create(10, {language: language1, learners: user.profile});
            await context.vocabFactory.create(10, {language: language2, learners: user.profile});
            await context.vocabFactory.create(5, {language: language1});
            await context.vocabFactory.create(5, {language: language2});

            const response = await makeRequest("me", {languageCode: language1.code}, session.token);

            const mappings = await context.em.find(MapLearnerVocab, {
                learner: user.profile,
                vocab: {language: language1}
            }, {populate: ["vocab", "vocab.language", "vocab.meanings"]});
            await context.vocabRepo.annotateUserMeanings(mappings, user.profile.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(learnerVocabSerializer.serializeList(mappings));
        });
        test<LocalTestContext>("If language does not exist return empty vocab list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.makeOne();

            const response = await makeRequest("me", {languageCode: language.code}, session.token);

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
    describe("test level filter", () => {
        test<LocalTestContext>("If level filter is valid only return vocabs the user is learning with that level ", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const level = randomEnum(VocabLevel);

            (await context.vocabFactory.create(5, {language})).forEach(v => context.em.create(MapLearnerVocab, {
                learner: user.profile,
                vocab: v,
                level: level
            }));
            await context.vocabFactory.create(5, {language, learners: user.profile});
            await context.em.flush();

            const response = await makeRequest("me", {level: level}, session.token);

            const mappings = await context.em.find(MapLearnerVocab, {
                learner: user.profile,
                level
            }, {populate: ["vocab", "vocab.language", "vocab.meanings"]});
            await context.vocabRepo.annotateUserMeanings(mappings, user.profile.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(learnerVocabSerializer.serializeList(mappings));
        });
        test<LocalTestContext>("If language filter is invalid return 400", async (context) => {
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
            const vocabs: Vocab[] = [];
            for (let i = 0; i < 5; i++) {
                vocabs.push(context.vocabFactory.makeOne({
                    language: language,
                    text: `text ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`,
                    learners: user.profile
                }));
            }
            await context.em.persistAndFlush(vocabs);
            await context.vocabFactory.create(5, {language: language, learners: user.profile});

            const response = await makeRequest("me", {searchQuery: searchQuery}, session.token);

            const mappings = await context.em.find(MapLearnerVocab, {learner: user.profile, vocab: vocabs},
                {populate: ["vocab", "vocab.language", "vocab.meanings"]});
            await context.vocabRepo.annotateUserMeanings(mappings, user.profile.id);
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(learnerVocabSerializer.serializeList(mappings));
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
            expect(response.json()).toEqual([]);
        });
    });
});

/**@link VocabController#getUserVocab*/
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
            const vocab = await context.vocabFactory.createOne({language, learners: user.profile});

            const response = await makeRequest("me", vocab.id, session.token);
            const mapping = await context.em.findOneOrFail(MapLearnerVocab, {learner: user.profile, vocab});
            await context.vocabRepo.annotateUserMeanings([mapping], user.profile.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(learnerVocabSerializer.serialize(mapping));
        });
        test<LocalTestContext>("If username is belongs to the current user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const vocab = await context.vocabFactory.createOne({language, learners: user.profile});

            const response = await makeRequest(user.username, vocab.id, session.token);
            const mapping = await context.em.findOneOrFail(MapLearnerVocab, {learner: user.profile, vocab});
            await context.vocabRepo.annotateUserMeanings([mapping], user.profile.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(learnerVocabSerializer.serialize(mapping));
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

/**@link VocabController#updateUserVocab*/
describe("PATCH users/:username/vocabs/:vocabId/", () => {
    const makeRequest = async (username: string | "me", vocabId: number | string, body: object, authToken?: string) => {
        const options: InjectOptions = {
            method: "PATCH",
            url: `users/${username}/vocabs/${vocabId}/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };

    describe("If all fields are valid, the vocab exists and user is learning it update user vocab", () => {
        test<LocalTestContext>("If username is me", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const vocab = await context.vocabFactory.createOne({language, learners: user.profile});
            // TODO check if entity is actually updated, added or deleted

            const response = await makeRequest("me", vocab.id, {level: VocabLevel.LEVEL_3, notes: "Vocab note"}, session.token);
            const mapping = await context.em.findOneOrFail(MapLearnerVocab, {learner: user.profile, vocab});
            await context.vocabRepo.annotateUserMeanings([mapping], user.profile.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(learnerVocabSerializer.serialize(mapping));
        });
        test<LocalTestContext>("If username is belongs to the current user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const vocab = await context.vocabFactory.createOne({language, learners: user.profile});

            const response = await makeRequest(user.username, vocab.id, {level: VocabLevel.LEVEL_3, notes: "Vocab note"}, session.token);
            const mapping = await context.em.findOneOrFail(MapLearnerVocab, {learner: user.profile, vocab});
            await context.vocabRepo.annotateUserMeanings([mapping], user.profile.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(learnerVocabSerializer.serialize(mapping));
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

            const response = await makeRequest("me", vocab.id, {level: VocabLevel.LEVEL_3, notes: faker.random.alpha(3000)}, session.token);

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

/**@link VocabController#getLessonVocabs*/
describe("PATCH lessons/:lessonId/vocabs/", () => {
    const makeRequest = async (username: string | "me", vocabId: number | string, body: object, authToken?: string) => {
        const options: InjectOptions = {
            method: "PATCH",
            url: `users/${username}/vocabs/${vocabId}/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };

    describe("If all fields are valid, the vocab exists and user is learning it update user vocab", () => {
        test<LocalTestContext>("If username is me", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const vocab = await context.vocabFactory.createOne({language, learners: user.profile});
            // TODO check if entity is actually updated, added or deleted

            const response = await makeRequest("me", vocab.id, {level: VocabLevel.LEVEL_3, notes: "Vocab note"}, session.token);
            const mapping = await context.em.findOneOrFail(MapLearnerVocab, {learner: user.profile, vocab});
            await context.vocabRepo.annotateUserMeanings([mapping], user.profile.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(learnerVocabSerializer.serialize(mapping));
        });
        test<LocalTestContext>("If username is belongs to the current user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const vocab = await context.vocabFactory.createOne({language, learners: user.profile});

            const response = await makeRequest(user.username, vocab.id, {level: VocabLevel.LEVEL_3, notes: "Vocab note"}, session.token);
            const mapping = await context.em.findOneOrFail(MapLearnerVocab, {learner: user.profile, vocab});
            await context.vocabRepo.annotateUserMeanings([mapping], user.profile.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(learnerVocabSerializer.serialize(mapping));
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

            const response = await makeRequest("me", vocab.id, {level: VocabLevel.LEVEL_3, notes: faker.random.alpha(3000)}, session.token);

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