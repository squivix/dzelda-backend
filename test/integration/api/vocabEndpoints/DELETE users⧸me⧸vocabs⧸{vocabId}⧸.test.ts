import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/integration/utils.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {faker} from "@faker-js/faker";

/**{@link VocabController#deleteUserVocab}*/
describe("DELETE users/me/vocabs/{vocabId}/", () => {
    const makeRequest = async (vocabId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "DELETE",
            url: `users/me/vocabs/${vocabId}/`,
        };
        return await fetchRequest(options, authToken);
    };
    test<TestContext>("If the vocab exists and user is learning it remove vocab from user", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language});
        context.em.create(MapLearnerVocab, {vocab, learner: user.profile});
        await context.em.flush();

        const response = await makeRequest(vocab.id, session.token);

        expect(response.statusCode).to.equal(204);
        expect(await context.em.findOne(MapLearnerVocab, {vocab, learner: user.profile})).toBeNull();
    });
    test<TestContext>(`If vocab does not exist return 404`, async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const response = await makeRequest(faker.datatype.number({min: 100000}), session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>(`If user is not learning vocab return 404`, async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language});

        const response = await makeRequest(vocab.id, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language, learners: user.profile});

        const response = await makeRequest(vocab.id);

        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language, learners: user.profile});

        const response = await makeRequest(vocab.id, session.token);

        expect(response.statusCode).to.equal(403);
    });
});
