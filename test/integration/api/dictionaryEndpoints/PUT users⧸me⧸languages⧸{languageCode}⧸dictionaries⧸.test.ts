import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {MapLearnerDictionary} from "@/src/models/entities/MapLearnerDictionary.js";
import {shuffleArray} from "@/test/utils.js";
import {faker} from "@faker-js/faker";

/**{@link DictionaryController#updateUserLanguageDictionaries}*/
describe("PUT users/me/languages/{languageCode}/dictionaries/", function () {
    const makeRequest = async (languageCode: string, body: object, authToken?: string) => {
        const options: InjectOptions = {
            method: "PUT",
            url: `users/me/languages/${languageCode}/dictionaries/`,
            body: body,
        };
        return await fetchRequest(options, authToken);
    };

    test<TestContext>("If user is logged in and all fields are valid update user dictionaries and return 204", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const existingDictionaries = await context.dictionaryFactory.create(3, {language});
        const otherLanguage = await context.languageFactory.createOne({learners: user.profile});
        const otherDictionaries = await context.dictionaryFactory.create(2, {language: otherLanguage});
        await context.em.insertMany(MapLearnerDictionary, [
            ...existingDictionaries,
            ...otherDictionaries
        ].map((d, i) => ({dictionary: d, learner: user.profile, order: i})));
        const newDictionaries = await context.dictionaryFactory.create(3, {language});
        const expectedDictionaries = [...shuffleArray(existingDictionaries).slice(1), ...newDictionaries];
        const dictIdsInOrder = shuffleArray(expectedDictionaries).map(d => d.id);

        const response = await makeRequest(language.code, {dictionaryIds: dictIdsInOrder}, session.token);

        const mappings = await context.em.find(MapLearnerDictionary, {learner: user.profile}, {orderBy: {order: "asc"}, populate: ["dictionary"]});

        expect(response.statusCode).to.equal(204);
        expect(mappings.map(m => m.dictionary.id)).toEqual(dictIdsInOrder);
        expect(mappings).toHaveLength(dictIdsInOrder.length);
        expect(mappings.map(m => m.order)).toEqual(dictIdsInOrder.map((_, i) => i));
    });
    test<TestContext>("If any dictionary is not in specified language return 400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language1 = await context.languageFactory.createOne({learners: user.profile});
        const dictionaries = await context.dictionaryFactory.create(3, {language: language1});
        const language2 = await context.languageFactory.createOne();
        const otherDictionaries = await context.dictionaryFactory.create(3, {language: language2});
        const dictIdsInOrder = [...dictionaries, ...otherDictionaries].map(d => d.id)
        const response = await makeRequest(language1.code, {dictionaryIds: dictIdsInOrder}, session.token);

        expect(response.statusCode).to.equal(400);
    });
    test<TestContext>("If any dictionary is not found return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});

        const response = await makeRequest(language.code, {dictionaryIds: [1, 2, 3]}, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If dictionaryIds is invalid return 400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const dictionary = await context.dictionaryFactory.createOne({language});

        const response = await makeRequest(language.code, {dictionaryIds: [dictionary.id, "abc"] as any}, session.token);

        expect(response.statusCode).to.equal(400);
    });
    test<TestContext>("If user is not learning language return 400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language1 = await context.languageFactory.createOne();
        const dictionaries = await context.dictionaryFactory.create(3, {language: language1});
        const response = await makeRequest(language1.code, {dictionaryIds: dictionaries.map(d => d.id)}, session.token);

        expect(response.statusCode).to.equal(400);
    });
    test<TestContext>("If languageCode is invalid return 400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const response = await makeRequest(faker.random.alpha(10), {dictionaryIds: []}, session.token);

        expect(response.statusCode).to.equal(400);
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const language = await context.languageFactory.createOne();
        const dictionary = await context.dictionaryFactory.createOne({language});

        const response = await makeRequest(language.code, {dictionaryIds: [dictionary.id]});

        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const dictionary = await context.dictionaryFactory.createOne({language});

        const response = await makeRequest(language.code, {dictionaryIds: [dictionary.id]}, session.token);

        expect(response.statusCode).to.equal(403);
    });
});