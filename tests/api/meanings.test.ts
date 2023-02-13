import {beforeEach, describe, expect, test, TestContext} from "vitest";
import {LanguageFactory} from "@/src/seeders/factories/LanguageFactory.js";
import {VocabFactory} from "@/src/seeders/factories/VocabFactory.js";
import {EntityRepository} from "@mikro-orm/core";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {orm} from "@/src/server.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/tests/api/utils.js";
import {MeaningFactory} from "@/src/seeders/factories/MeaningFactory.js";
import {meaningSerializer} from "@/src/schemas/response/serializers/MeaningSerializer.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {faker} from "@faker-js/faker";
import {vocabSerializer} from "@/src/schemas/response/serializers/VocabSerializer.js";

interface LocalTestContext extends TestContext {
    languageFactory: LanguageFactory;
    vocabFactory: VocabFactory;
    meaningFactory: MeaningFactory;
    vocabRepo: EntityRepository<Vocab>;
    meaningRepo: EntityRepository<Meaning>;

}

beforeEach<LocalTestContext>((context) => {
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.profileFactory = new ProfileFactory(context.em);
    context.sessionFactory = new SessionFactory(context.em);
    context.languageFactory = new LanguageFactory(context.em);
    context.vocabFactory = new VocabFactory(context.em);
    context.meaningFactory = new MeaningFactory(context.em);

    context.vocabRepo = context.em.getRepository(Vocab);
    context.meaningRepo = context.em.getRepository(Meaning);
});
/**@link MeaningController#createMeaning*/
describe("POST meanings/", () => {
    const makeRequest = async (body: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `meanings/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };
    test<LocalTestContext>("If user is logged in and all fields are valid create a new meaning and return it", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const vocab = await context.vocabFactory.createOne({language: language});
        const newMeaning = context.meaningFactory.makeOne({language: language, vocab: vocab, addedBy: user.profile});
        const response = await makeRequest({
            languageCode: language.code,
            text: newMeaning.text,
            vocabId: vocab.id
        }, session.token);

        expect(response.statusCode).toEqual(201);
        expect(response.json()).toEqual(expect.objectContaining(meaningSerializer.serialize(newMeaning, {ignore: ["addedOn"]})));
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const vocab = await context.vocabFactory.createOne({language: language});
        const newMeaning = context.meaningFactory.makeOne({language: language, vocab: vocab, addedBy: user.profile});
        const response = await makeRequest({
            languageCode: language.code,
            text: newMeaning.text,
            vocabId: vocab.id
        });

        expect(response.statusCode).toEqual(401);
    });
    describe("If fields are missing return 400", () => {
        test<LocalTestContext>("If languageCode is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const vocab = await context.vocabFactory.createOne({language: language});
            const newMeaning = context.meaningFactory.makeOne({language: language, vocab: vocab, addedBy: user.profile});
            const response = await makeRequest({
                text: newMeaning.text,
                vocabId: vocab.id
            }, session.token);

            expect(response.statusCode).toEqual(400);
        });
        test<LocalTestContext>("If text is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const vocab = await context.vocabFactory.createOne({language: language});
            const newMeaning = context.meaningFactory.makeOne({language: language, vocab: vocab, addedBy: user.profile});
            const response = await makeRequest({
                languageCode: language.code,
                vocabId: vocab.id
            }, session.token);

            expect(response.statusCode).toEqual(400);
        });
        test<LocalTestContext>("If vocabId is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const vocab = await context.vocabFactory.createOne({language: language});
            const newMeaning = context.meaningFactory.makeOne({language: language, vocab: vocab, addedBy: user.profile});
            const response = await makeRequest({
                languageCode: language.code,
                text: newMeaning.text
            }, session.token);

            expect(response.statusCode).toEqual(400);
        });
    });
    describe("If fields are invalid return 400", () => {
        describe("If language is invalid return 400", async () => {
            test<LocalTestContext>("If languageCode is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language: language});
                const newMeaning = context.meaningFactory.makeOne({language: language, vocab: vocab, addedBy: user.profile});
                const response = await makeRequest({
                    languageCode: faker.random.alphaNumeric(10),
                    text: newMeaning.text,
                    vocabId: vocab.id
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
            test<LocalTestContext>("If language does not exist return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language: language});
                const newMeaning = context.meaningFactory.makeOne({language: language, vocab: vocab, addedBy: user.profile});
                const response = await makeRequest({
                    languageCode: faker.random.alphaNumeric(2),
                    text: newMeaning.text,
                    vocabId: vocab.id
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
        });
        test<LocalTestContext>("If text is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const vocab = await context.vocabFactory.createOne({language: language});
            const response = await makeRequest({
                languageCode: language.code,
                text: faker.random.alpha(1100),
                vocabId: vocab.id
            }, session.token);

            expect(response.statusCode).toEqual(400);
        });
        describe("If vocab is invalid return 400", async () => {
            test<LocalTestContext>("If vocabId is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language: language});
                const newMeaning = context.meaningFactory.makeOne({language: language, vocab: vocab, addedBy: user.profile});
                const response = await makeRequest({
                    languageCode: language.code,
                    text: newMeaning.text,
                    vocabId: faker.random.alpha(3)
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
            test<LocalTestContext>("If vocab does not exist return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language: language});
                const newMeaning = context.meaningFactory.makeOne({language: language, vocab: vocab, addedBy: user.profile});
                const response = await makeRequest({
                    languageCode: language.code,
                    text: newMeaning.text,
                    vocabId: faker.datatype.number({min: 1000})
                }, session.token);

                expect(response.statusCode).toEqual(400);
            });
        });
    });
    test<LocalTestContext>("If meaning with same text and language for same vocab  already exists return 200", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const vocab = await context.vocabFactory.createOne({language: language});
        const oldMeaning = await context.meaningFactory.createOne({language: language, vocab: vocab, addedBy: user.profile});
        const newMeaning = context.meaningFactory.makeOne({language: language, vocab: vocab, addedBy: user.profile, text: oldMeaning.text});
        const response = await makeRequest({
            languageCode: language.code,
            text: newMeaning.text,
            vocabId: vocab.id
        }, session.token);

        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual(meaningSerializer.serialize(oldMeaning));
    });
});