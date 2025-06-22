import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest, omit} from "@/test/integration/integrationTestUtils.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {faker} from "@faker-js/faker";
import {meaningDTO} from "@/src/presentation/response/dtos/Meaning/MeaningDTO.js";

/**{@link MeaningController#createMeaning}*/
describe("POST meanings/", () => {
    const makeRequest = async (body: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `meanings/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };
    test<TestContext>("If user is logged in and all fields are valid create a new meaning and return it", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const translationLanguage = await context.translationLanguageFactory.createOne();
        const vocab = await context.vocabFactory.createOne({language: language});
        const newMeaning = context.meaningFactory.makeOne({language: translationLanguage, vocab: vocab, addedBy: user.profile, learnersCount: 0, addedOn: new Date()});

        const response = await makeRequest({
            languageCode: translationLanguage.code,
            text: newMeaning.text,
            vocabId: vocab.id
        }, session.token);

        expect(response.statusCode).toEqual(201);
        expect(response.json()).toMatchObject(omit(meaningDTO.serialize(newMeaning), ["id", "addedOn"]));
        const dbRecord = await context.em.findOne(Meaning, {text: newMeaning.text, language, vocab});
        expect(dbRecord).not.toBeNull();
        expect(meaningDTO.serialize(dbRecord!)).toMatchObject(omit(meaningDTO.serialize(newMeaning), ["id", "addedOn"]));
    });
    test<TestContext>("If meaning with same text and language for same vocab already exists return 200", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const translationLanguage = await context.translationLanguageFactory.createOne();
        const vocab = await context.vocabFactory.createOne({language: language});

        const existingMeaning = await context.meaningFactory.createOne({language: translationLanguage, vocab: vocab, addedBy: user.profile, learnersCount: 0});

        const response = await makeRequest({
            languageCode: translationLanguage.code,
            text: existingMeaning.text,
            vocabId: vocab.id
        }, session.token);

        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual(expect.objectContaining(meaningDTO.serialize(existingMeaning)));
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const translationLanguage = await context.translationLanguageFactory.createOne();
        const vocab = await context.vocabFactory.createOne({language: language});
        const newMeaning = context.meaningFactory.makeOne({language: translationLanguage, vocab: vocab, addedBy: user.profile});
        const response = await makeRequest({
            languageCode: translationLanguage.code,
            text: newMeaning.text,
            vocabId: vocab.id
        });

        expect(response.statusCode).toEqual(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const translationLanguage = await context.translationLanguageFactory.createOne();
        const vocab = await context.vocabFactory.createOne({language: language});
        const newMeaning = context.meaningFactory.makeOne({language: translationLanguage, vocab: vocab, addedBy: user.profile});
        const response = await makeRequest({
            languageCode: translationLanguage.code,
            text: newMeaning.text,
            vocabId: vocab.id
        }, session.token);

        expect(response.statusCode).toEqual(403);
    });
    describe("If fields are missing return 400", () => {
        test<TestContext>("If languageCode is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const translationLanguage = await context.translationLanguageFactory.createOne();
            const vocab = await context.vocabFactory.createOne({language: language});
            const newMeaning = context.meaningFactory.makeOne({language: translationLanguage, vocab: vocab, addedBy: user.profile});
            const response = await makeRequest({
                text: newMeaning.text,
                vocabId: vocab.id
            }, session.token);

            expect(response.statusCode).toEqual(400);
        });
        test<TestContext>("If text is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const translationLanguage = await context.translationLanguageFactory.createOne();
            const vocab = await context.vocabFactory.createOne({language: language});
            const newMeaning = context.meaningFactory.makeOne({language: translationLanguage, vocab: vocab, addedBy: user.profile});
            const response = await makeRequest({
                languageCode: translationLanguage.code,
                vocabId: vocab.id
            }, session.token);

            expect(response.statusCode).toEqual(400);
        });
        test<TestContext>("If vocabId is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const translationLanguage = await context.translationLanguageFactory.createOne();
            const vocab = await context.vocabFactory.createOne({language: language});
            const newMeaning = context.meaningFactory.makeOne({language: translationLanguage, vocab: vocab, addedBy: user.profile});
            const response = await makeRequest({
                languageCode: translationLanguage.code,
                text: newMeaning.text
            }, session.token);

            expect(response.statusCode).toEqual(400);
        });
    });
    describe("If fields are invalid return 400", () => {
        describe("If language is invalid return 400", async () => {
            test<TestContext>("If languageCode is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const translationLanguage = await context.translationLanguageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language: language});
                const newMeaning = context.meaningFactory.makeOne({language: translationLanguage, vocab: vocab, addedBy: user.profile});
                const response = await makeRequest({
                    languageCode: faker.random.alphaNumeric(10),
                    text: newMeaning.text,
                    vocabId: vocab.id
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
            test<TestContext>("If language does not exist return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const translationLanguage = await context.translationLanguageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language: language});
                const newMeaning = context.meaningFactory.makeOne({language: translationLanguage, vocab: vocab, addedBy: user.profile});
                const response = await makeRequest({
                    languageCode: faker.random.alphaNumeric(2),
                    text: newMeaning.text,
                    vocabId: vocab.id
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
        });
        test<TestContext>("If text is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const translationLanguage = await context.translationLanguageFactory.createOne();
            const vocab = await context.vocabFactory.createOne({language: language});
            const response = await makeRequest({
                languageCode: translationLanguage.code,
                text: faker.random.alpha(1100),
                vocabId: vocab.id
            }, session.token);

            expect(response.statusCode).toEqual(400);
        });
        describe("If vocab is invalid return 400", async () => {
            test<TestContext>("If vocabId is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const translationLanguage = await context.translationLanguageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language: language});
                const newMeaning = context.meaningFactory.makeOne({language: translationLanguage, vocab: vocab, addedBy: user.profile});
                const response = await makeRequest({
                    languageCode: translationLanguage.code,
                    text: newMeaning.text,
                    vocabId: faker.random.alpha(3)
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
            test<TestContext>("If vocab does not exist return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const translationLanguage = await context.translationLanguageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language: language});
                const newMeaning = context.meaningFactory.makeOne({language: translationLanguage, vocab: vocab, addedBy: user.profile});
                const response = await makeRequest({
                    languageCode: translationLanguage.code,
                    text: newMeaning.text,
                    vocabId: faker.datatype.number({min: 100000})
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
        });
    });
});
