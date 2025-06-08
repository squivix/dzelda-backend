import {describe, expect, test, TestContext, vi} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/integration/utils.js";
import {vocabSerializer} from "@/src/presentation/response/serializers/entities/VocabSerializer.js";
import {faker} from "@faker-js/faker";
import {parsers} from "dzelda-common";

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

    test<TestContext>("If user is logged in and all fields are valid create a new vocab and return it", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();

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
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const language = await context.languageFactory.createOne();
        const newVocab = context.vocabFactory.makeOne({language: language});
        const response = await makeRequest({
            languageCode: language.code,
            text: newVocab.text,
            isPhrase: newVocab.isPhrase
        });

        expect(response.statusCode).toEqual(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const newVocab = context.vocabFactory.makeOne({language: language});
        const response = await makeRequest({
            languageCode: language.code,
            text: newVocab.text,
            isPhrase: newVocab.isPhrase
        }, session.token);

        expect(response.statusCode).toEqual(403);
    });
    describe("If fields are missing return 400", async () => {
        test<TestContext>("If languageCode is missing return 400", async (context) => {
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
        test<TestContext>("If text is missing return 400", async (context) => {
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
        test<TestContext>("If isPhrase is missing return 400", async (context) => {
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
            test<TestContext>("If languageCode is invalid return 400", async (context) => {
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
            test<TestContext>("If language does not exist return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const newVocab = context.vocabFactory.makeOne();
                const response = await makeRequest({
                    languageCode: faker.random.alphaNumeric(2),
                    text: newVocab.text,
                    isPhrase: newVocab.isPhrase
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
        });
        describe("If text is invalid return 400", async () => {
            test<TestContext>("If text contains no parsable words return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();

                const newVocab = context.vocabFactory.makeOne({language: language});
                const response = await makeRequest({
                    languageCode: language.code,
                    text: faker.random.numeric(5),
                    isPhrase: newVocab.isPhrase
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
            test<TestContext>("If text contains more than one parsable words and isPhrase is false return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();

                const response = await makeRequest({
                    languageCode: language.code,
                    text: faker.random.words(2),
                    isPhrase: false
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
            test<TestContext>("If text is longer than 255 characters return 400", async (context) => {
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
        test<TestContext>("If isPhrase is invalid return 400", async (context) => {
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
    test<TestContext>("If vocab with same text already exists for the language return 200", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
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
