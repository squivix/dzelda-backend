import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest, omit} from "@/test/integration/integrationTestUtils.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";
import {faker} from "@faker-js/faker";
import {meaningDTO} from "@/src/presentation/response/dtos/Meaning/MeaningDTO.js";

/**{@link MeaningController#addMeaningToUser}*/
describe("POST users/me/meanings/", () => {
    const makeRequest = async (body: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `users/me/meanings/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };

    test<TestContext>("If the meaning exists and user is learning meaning vocab language add meaning to user's meanings learning", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const translationLanguage = await context.translationLanguageFactory.createOne();
        const vocab = await context.vocabFactory.createOne({language});
        const meaning = await context.meaningFactory.createOne({vocab, language: translationLanguage});
        const oldLearnersCount = meaning.learnersCount;

        const response = await makeRequest({meaningId: meaning.id}, session.token);

        expect(response.statusCode).to.equal(201);
        expect(response.json()).toMatchObject(omit(meaningDTO.serialize(meaning), ["learnersCount"]));
        expect(await context.em.findOne(MapLearnerMeaning, {learner: user.profile, meaning})).not.toBeNull();
        expect(await meaning.learners.loadCount()).toEqual(oldLearnersCount + 1);
    });
    test<TestContext>("If user is already learning meaning return 200", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const translationLanguage = await context.translationLanguageFactory.createOne();
        const vocab = await context.vocabFactory.createOne({language});
        const meaning = await context.meaningFactory.createOne({vocab, language: translationLanguage, learners: user.profile});

        const response = await makeRequest({meaningId: meaning.id}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(meaningDTO.serialize(meaning));
    });
    describe("If required fields are missing return 400", function () {
        test<TestContext>("If the meaningId is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const response = await makeRequest({}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 400", function () {
        describe("If the meaning is invalid return 400", async () => {
            test<TestContext>("If the meaningId is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest({meaningId: faker.random.alpha(10)}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If the meaning is not found return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest({meaningId: faker.datatype.number({min: 100000})}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If the meaning vocab is not in a language the user is learning return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const translationLanguage = await context.translationLanguageFactory.createOne();
                const vocab = await context.vocabFactory.createOne({language});
                const meaning = await context.meaningFactory.createOne({vocab, language: translationLanguage, addedBy: otherUser.profile});

                const response = await makeRequest({meaningId: meaning.id}, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
    });
    test<TestContext>("If user is not logged in return 401", async () => {
        const response = await makeRequest({});
        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const response = await makeRequest({}, session.token);
        expect(response.statusCode).to.equal(403);
    });
});
