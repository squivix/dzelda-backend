import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {createComparator, fetchRequest} from "@/tests/integration/utils.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {learnerVocabSerializer} from "@/src/presentation/response/serializers/mappings/LearnerVocabSerializer.js";
import {faker} from "@faker-js/faker";

/**{@link VocabController#getTextVocabs}*/
describe("GET texts/{textId}/vocabs/", () => {
    const makeRequest = async (textId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `texts/${textId}/vocabs/`
        };
        return await fetchRequest(options, authToken);
    };
    const defaultSortComparator = createComparator(Vocab, [
        {property: "text", order: "asc"},
        {property: "id", order: "asc"}]
    );
    // TODO write more realistic tests involving multiple learners and non-learners.
    //  This test failed and still fails to catch 2 HUGE logical errors with SQL bad queries:
    //  1) non-null-safe != for map_learner_vocab.learner_id
    //  2) if user1 is learning vocab and user2 is not learning vocab just filtering by learner_id != user2_id won't detect new vocabs for user2 because user1 records will survive the filter
    test<TestContext>("If user is logged in, text exists and is public return vocabs in text", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language, isPublic: true});
        const expectedNewVocabs = await context.vocabFactory.create(3, {language, textsAppearingIn: text});
        const expectedExistingVocabs = await context.vocabFactory.create(3, {language, textsAppearingIn: text});
        const expectedExistingMappings = [];
        for (let vocab of expectedExistingVocabs)
            expectedExistingMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
        await context.em.flush();
        const expectedTextVocabs = [...expectedExistingMappings, ...expectedNewVocabs];
        await context.vocabFactory.create(10, {language});
        const response = await makeRequest(text.id, session.token);

        expect(response.statusCode).to.equal(200);
        const responseBody = response.json();
        const expectedBody = learnerVocabSerializer.serializeList(expectedTextVocabs);
        //ignore order
        expect(responseBody.length).toEqual(expectedBody.length);
        expect(responseBody).toEqual(expect.arrayContaining(expectedBody));
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne({learners: user.profile});
        const text = await context.textFactory.createOne({language});

        const response = await makeRequest(text.id);

        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const text = await context.textFactory.createOne({language});

        const response = await makeRequest(text.id, session.token);

        expect(response.statusCode).to.equal(403);
    });
    test<TestContext>("If text does not exists return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});

        const response = await makeRequest(faker.datatype.number({min: 10000000}), session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If text is not public and user is not author return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language, isPublic: false});

        const response = await makeRequest(text.id, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If text is not public and user is author return text vocabs", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language, isPublic: false, addedBy: user.profile});
        const expectedNewVocabs = await context.vocabFactory.create(3, {language, textsAppearingIn: text});
        const expectedExistingVocabs = await context.vocabFactory.create(3, {language, textsAppearingIn: text});
        const expectedExistingMappings = [];
        for (let vocab of expectedExistingVocabs)
            expectedExistingMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
        await context.em.flush();
        const expectedTextVocabs = [...expectedExistingMappings, ...expectedNewVocabs];
        await context.vocabFactory.create(10, {language});
        const response = await makeRequest(text.id, session.token);

        expect(response.statusCode).to.equal(200);
        const responseBody = response.json();
        const expectedBody = learnerVocabSerializer.serializeList(expectedTextVocabs);
        //ignore order
        expect(responseBody.length).toEqual(expectedBody.length);
        expect(responseBody).toEqual(expect.arrayContaining(expectedBody));
    });


});
