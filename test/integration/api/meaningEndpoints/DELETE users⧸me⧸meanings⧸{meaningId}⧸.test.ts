/**{@link MeaningController#removeMeaningFromUser}*/
import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";
import {faker} from "@faker-js/faker";


describe("DELETE users/me/meanings/{meaningId}/", () => {
    const makeRequest = async (meaningId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "DELETE",
            url: `users/me/meanings/${meaningId}/`,
        };
        return await fetchRequest(options, authToken);
    };

    test<TestContext>("If user is logged in and is learning meaning delete meaning for user and return 204", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const translationLanguage = await context.translationLanguageFactory.createOne();
        const vocab = await context.vocabFactory.createOne({language});
        const meaning = await context.meaningFactory.createOne({vocab, language: translationLanguage, addedBy: user.profile, learners: user.profile});
        const oldLearnersCount = meaning.learnersCount;

        const response = await makeRequest(meaning.id, session.token);

        expect(response.statusCode).to.equal(204);
        expect(await context.em.findOne(MapLearnerMeaning, {learner: user.profile, meaning})).toBeNull();
        expect(await meaning.learners.loadCount()).toEqual(oldLearnersCount - 1);
    });
    test<TestContext>("If user is not learning meaning return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const translationLanguage = await context.translationLanguageFactory.createOne();
        const vocab = await context.vocabFactory.createOne({language});
        const meaning = await context.meaningFactory.createOne({vocab, language: translationLanguage, addedBy: user.profile});

        const response = await makeRequest(meaning.id, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If meaning does not exist return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const response = await makeRequest(faker.datatype.number({min: 10000000}), session.token);
        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne({learners: user.profile});
        const translationLanguage = await context.translationLanguageFactory.createOne();
        const vocab = await context.vocabFactory.createOne({language});
        const meaning = await context.meaningFactory.createOne({vocab, language: translationLanguage, addedBy: user.profile, learners: user.profile});
        const response = await makeRequest(meaning.id);
        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const translationLanguage = await context.translationLanguageFactory.createOne();
        const vocab = await context.vocabFactory.createOne({language});
        const meaning = await context.meaningFactory.createOne({vocab, language: translationLanguage, addedBy: user.profile, learners: user.profile});

        const response = await makeRequest(meaning.id, session.token);

        expect(response.statusCode).to.equal(403);
    });
});
