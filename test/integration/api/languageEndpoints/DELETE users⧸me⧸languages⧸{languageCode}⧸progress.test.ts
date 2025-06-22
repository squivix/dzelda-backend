import {describe, expect, test, TestContext} from "vitest";
import {TextHistoryEntry} from "@/src/models/entities/TextHistoryEntry.js";
import {MapLearnerDictionary} from "@/src/models/entities/MapLearnerDictionary.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";

/**{@link LanguageController#resetUserLanguageProgress}*/
describe("DELETE users/me/languages/{languageCode}/progress", () => {
    const makeRequest = async (languageCode: string, authToken?: string) => {
        const options: InjectOptions = {
            method: "DELETE",
            url: `users/me/languages/${languageCode}/progress/`,
        };
        return await fetchRequest(options, authToken);
    };
    test<TestContext>("If user is logged in and is learning language delete all associated resources of language return 204", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne({learners: user.profile});

        const collections = await context.collectionFactory.create(3, {language});
        const texts = [
            ...await context.textFactory.create(3, {language, collection: collections[0]}),
            ...await context.textFactory.create(3, {language, collection: collections[1]}),
            ...await context.textFactory.create(3, {language, collection: collections[2]})
        ];
        await context.em.insertMany(TextHistoryEntry, texts.map(l => ({text: l, pastViewer: user.profile})));
        const dictionaries = await context.dictionaryFactory.create(3, {language});
        await context.em.insertMany(MapLearnerDictionary, dictionaries.map(d => ({dictionary: d, learner: user.profile})));
        const vocabs = await context.vocabFactory.create(3, {language});
        await context.em.insertMany(MapLearnerVocab, vocabs.map(v => ({vocab: v, learner: user.profile})));
        const meaningLanguage = await context.translationLanguageFactory.createOne();

        const meanings = [
            ...await context.meaningFactory.create(3, {addedBy: user.profile, vocab: vocabs[0], language: meaningLanguage}),
            ...await context.meaningFactory.create(3, {addedBy: user.profile, vocab: vocabs[1], language: meaningLanguage}),
            ...await context.meaningFactory.create(3, {addedBy: user.profile, vocab: vocabs[2], language: meaningLanguage})];
        await context.em.insertMany(MapLearnerMeaning, meanings.map(m => ({meaning: m, learner: user.profile})));

        const response = await makeRequest(language.code, session.token);

        expect(response.statusCode).to.equal(204);

        expect(await context.em.findOne(MapLearnerLanguage, {learner: user.profile, language})).not.toBeNull();
        expect(await context.em.find(MapLearnerDictionary, {learner: user.profile, dictionary: {language}})).toHaveLength(0);
        expect(await context.em.find(MapLearnerVocab, {learner: user.profile, vocab: {language}})).toHaveLength(0);
        expect(await context.em.find(MapLearnerMeaning, {learner: user.profile, meaning: {vocab: {language}}})).toHaveLength(0);
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne({learners: user.profile});

        const response = await makeRequest(language.code);

        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});

        const response = await makeRequest(language.code, session.token);

        expect(response.statusCode).to.equal(403);
    });
    test<TestContext>("If languageCode is invalid return  400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});

        const response = await makeRequest("", session.token);

        expect(response.statusCode).to.equal(400);
    });
    test<TestContext>("If language is not found return  404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = context.languageFactory.makeOne();

        const response = await makeRequest(language.code, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If user is not learning language return  404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();

        const response = await makeRequest(language.code, session.token);

        expect(response.statusCode).to.equal(404);
    });
});
