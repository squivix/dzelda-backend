import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest, omit} from "@/test/integration/integrationTestUtils.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {faker} from "@faker-js/faker";
import {learnerLanguageSerializer} from "@/src/presentation/response/serializers/Language/LearnerLanguageSerializer.js";
import {PreferredTranslationLanguageEntry} from "@/src/models/entities/PreferredTranslationLanguageEntry.js";

/**{@link LanguageController#addLanguageToUser}*/
describe("POST users/me/languages/", function () {
    const makeRequest = async (body: object, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `users/me/languages/`,
            payload: body,
        };
        return await fetchRequest(options, authToken);
    };

    test<TestContext>("If user is logged in, and all fields are valid return 201", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learnersCount: 1});
        const translationLanguages = await context.translationLanguageFactory.create(3);

        const expectedMapping = context.em.create(MapLearnerLanguage, {
            language,
            learner: user.profile,
            startedLearningOn: new Date(),
            lastOpened: new Date(),
        }, {persist: false});
        const expectedPreferredTLEntries = translationLanguages.map((t, i) => context.em.create(PreferredTranslationLanguageEntry, {
            learnerLanguageMapping: expectedMapping,
            translationLanguage: t,
            precedenceOrder: i
        }, {persist: false}))
        expectedMapping.preferredTranslationLanguageEntries.set(expectedPreferredTLEntries);

        const response = await makeRequest({languageCode: language.code, preferredTranslationLanguageCodes: translationLanguages.map(t => t.code)}, session.token);

        const responseBody = response.json();
        expect(response.statusCode).toEqual(201);
        expect(responseBody).toMatchObject(omit(learnerLanguageSerializer.serialize(expectedMapping, {assertNoUndefined: false}), ["startedLearningOn", "lastOpened"]));
        const dbRecord = await context.em.findOne(MapLearnerLanguage, {language, learner: user.profile}, {populate: ["preferredTranslationLanguageEntries"]});
        expect(dbRecord).not.toBeNull();
        expect(learnerLanguageSerializer.serialize(dbRecord!)).toMatchObject(omit(learnerLanguageSerializer.serialize(expectedMapping, {assertNoUndefined: false}), ["startedLearningOn", "lastOpened"]));
    });
    test<TestContext>("If user is already learning language return 200", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learnersCount: 1});
        const expectedMapping = context.em.create(MapLearnerLanguage, {language, learner: user.profile});
        await context.em.flush();

        const response = await makeRequest({languageCode: language.code}, session.token);

        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual(learnerLanguageSerializer.serialize(expectedMapping));
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const language = await context.languageFactory.createOne();

        const response = await makeRequest({languageCode: language.code});
        expect(response.statusCode).toEqual(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();

        const response = await makeRequest({languageCode: language.code}, session.token);
        expect(response.statusCode).toEqual(403);
    });
    describe("If fields are invalid return 400", () => {
        describe("If language is invalid return 400", () => {
            test<TestContext>("If languageCode is invalid  return 400", async (context) => {
                const currentUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: currentUser});

                const response = await makeRequest({languageCode: faker.random.alpha({count: 10})}, session.token);
                expect(response.statusCode).toEqual(400);
            });
            test<TestContext>("If language is not found return 400", async (context) => {
                const currentUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: currentUser});
                const language = context.languageFactory.makeOne();

                const response = await makeRequest({languageCode: language.code}, session.token);
                expect(response.statusCode).toEqual(400);
            });
        });
    });
});
