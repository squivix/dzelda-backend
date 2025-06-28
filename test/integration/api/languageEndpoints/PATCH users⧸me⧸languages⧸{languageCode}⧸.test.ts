import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest, omit} from "@/test/integration/integrationTestUtils.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {learnerLanguageSerializer} from "@/src/presentation/response/serializers/Language/LearnerLanguageSerializer.js";

/**{@link LanguageController#updateUserLanguage}*/
describe("PATCH users/me/languages/{languageCode}/", () => {
    const makeRequest = async (languageCode: string, body: object, authToken?: string) => {
        const options: InjectOptions = {
            method: "PATCH",
            url: `users/me/languages/${languageCode}/`,
            payload: body,
        };
        return await fetchRequest(options, authToken);
    };
    test<TestContext>("If user is logged in, and all fields are valid return 200", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne({learnersCount: 1});
        const oldLastOpened = "2023-02-14T11:00:43.818Z", oldAddedOn = "2023-01-14T11:00:43.818Z";
        const expectedMapping = context.em.create(MapLearnerLanguage, {
            learner: user.profile,
            language: language,
            startedLearningOn: new Date(oldAddedOn),
            lastOpened: new Date(oldLastOpened)
        });
        await context.em.flush();

        const response = await makeRequest(language.code, {lastOpened: "now"}, session.token);

        const responseBody = response.json();
        const dbRecord = await context.em.findOneOrFail(MapLearnerLanguage, {language, learner: user.profile});

        expect(response.statusCode).toEqual(200);
        expect(responseBody).toMatchObject(omit(learnerLanguageSerializer.serialize(expectedMapping, {assertNoUndefined: false}), ["startedLearningOn", "lastOpened"]));
        expect(responseBody).toMatchObject(learnerLanguageSerializer.serialize(dbRecord));
        const {addedOn: newAddedOn, lastOpened: newLastOpened} = responseBody;
        expect(newAddedOn).not.toEqual(oldAddedOn);
        expect(newLastOpened).not.toEqual(oldLastOpened);
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const language = await context.languageFactory.createOne();

        const response = await makeRequest(language.code, {lastOpened: "now"});

        expect(response.statusCode).toEqual(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();

        const response = await makeRequest(language.code, {lastOpened: "now"}, session.token);

        expect(response.statusCode).toEqual(403);
    });
    test<TestContext>("If languageCode is invalid return  400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});

        const response = await makeRequest("", {lastOpened: "now"}, session.token);

        expect(response.statusCode).toEqual(400);
    });
    test<TestContext>("If language is not found return  404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.makeOne();

        const response = await makeRequest(language.code, {lastOpened: "now"}, session.token);

        expect(response.statusCode).toEqual(404);
    });
    test<TestContext>("If user is not learning language return  404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();

        const response = await makeRequest(language.code, {lastOpened: "now"}, session.token);

        expect(response.statusCode).toEqual(404);
    });
    test<TestContext>("If lastOpened is not 'now' return  400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();

        const response = await makeRequest(language.code, {lastOpened: "2023-02-14T11:00:43.818Z"}, session.token);

        expect(response.statusCode).toEqual(400);
    });
});
