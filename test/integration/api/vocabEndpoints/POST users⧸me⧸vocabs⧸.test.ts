import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {faker} from "@faker-js/faker";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {learnerVocabDTO} from "@/src/presentation/response/dtos/Vocab/LearnerVocabDTO.js";

/**{@link VocabController#addVocabToUser}*/
describe("POST users/me/vocabs/", () => {
    const makeRequest = async (body: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `users/me/vocabs/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };
    // TODO test optional field: level
    test<TestContext>("If the vocab exists and user is learning vocab language add vocab to user's vocabs learning", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language});
        const expectedMapping = context.em.create(MapLearnerVocab, {learner: user.profile, vocab}, {persist: false});

        const response = await makeRequest({vocabId: vocab.id}, session.token);
        await context.em.find(Vocab, vocab, {refresh: true});

        expect(response.statusCode).to.equal(201);
        expect(response.json()).toEqual(learnerVocabDTO.serialize(expectedMapping));
        const dbRecord = await context.em.findOne(MapLearnerVocab, {learner: user.profile, vocab});
        expect(dbRecord).not.toBeNull();
        expect(learnerVocabDTO.serialize(dbRecord!)).toEqual(learnerVocabDTO.serialize(expectedMapping));
    });
    test<TestContext>("If user is already learning vocab return 200", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language});
        const mapping = context.em.create(MapLearnerVocab, {learner: user.profile, vocab});
        await context.em.flush();

        const response = await makeRequest({vocabId: vocab.id}, session.token);
        await context.em.find(Vocab, vocab, {refresh: true});

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(learnerVocabDTO.serialize(mapping));
    });
    describe("If required fields are missing return 400", function () {
        test<TestContext>("If the vocabId is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const response = await makeRequest({}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 400", function () {
        describe("If the vocab is invalid return 400", async () => {
            test<TestContext>("If the vocabId is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest({vocabId: faker.random.alpha(10)}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If the vocab is not found return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest({vocabId: faker.datatype.number({min: 100000})}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If the vocab is not in a language the user is learning return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});

                const response = await makeRequest({vocabId: vocab.id}, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language});

        const response = await makeRequest({vocabId: vocab.id});
        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language});

        const response = await makeRequest({vocabId: vocab.id}, session.token);
        expect(response.statusCode).to.equal(403);
    });
});
