import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {faker} from "@faker-js/faker";
import {learnerVocabForTextSerializer} from "@/src/presentation/response/serializers/Vocab/LearnerVocabForTextSerializer.js";
import {vocabForTextSerializer} from "@/src/presentation/response/serializers/Vocab/VocabForTextSerializer.js";

/**{@link VocabController#getTextVocabs}*/
describe("GET texts/{textId}/vocabs/", () => {
    const makeRequest = async (textId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `texts/${textId}/vocabs/`
        };
        return await fetchRequest(options, authToken);
    };
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
        await context.vocabFactory.create(10, {language});
        const response = await makeRequest(text.id, session.token);
        await context.em.find(Vocab, expectedExistingVocabs, {refresh: true});

        expect(response.statusCode).toEqual(200);
        const responseBody = response.json();
        const expectedBody = [...learnerVocabForTextSerializer.serializeList(expectedExistingMappings), ...vocabForTextSerializer.serializeList(expectedNewVocabs)];
        //ignore order
        expect(responseBody.length).toEqual(expectedBody.length);
        expect(responseBody).toEqual(expect.arrayContaining(expectedBody));
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne({learners: user.profile});
        const text = await context.textFactory.createOne({language});

        const response = await makeRequest(text.id);

        expect(response.statusCode).toEqual(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const text = await context.textFactory.createOne({language});

        const response = await makeRequest(text.id, session.token);

        expect(response.statusCode).toEqual(403);
    });
    test<TestContext>("If text does not exists return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});

        const response = await makeRequest(faker.datatype.number({min: 10000000}), session.token);

        expect(response.statusCode).toEqual(404);
    });
    describe("test privacy", () => {
        describe("Hide private texts from non-authors", () => {
            test<TestContext>("If the text is private and the user is non-author return 404", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const text = await context.textFactory.createOne({language, isPublic: false});

                const response = await makeRequest(text.id, session.token);

                expect(response.statusCode).toEqual(404);
            });
            test<TestContext>("If the text is private and the user is author return vocabs in text", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const text = await context.textFactory.createOne({language, isPublic: false, addedBy: author.profile});
                const expectedNewVocabs = await context.vocabFactory.create(3, {language, textsAppearingIn: text});
                const expectedExistingVocabs = await context.vocabFactory.create(3, {language, textsAppearingIn: text});
                const expectedExistingMappings = [];
                for (let vocab of expectedExistingVocabs)
                    expectedExistingMappings.push(context.em.create(MapLearnerVocab, {learner: author.profile, vocab}));
                await context.em.flush();
                await context.vocabFactory.create(10, {language});
                const response = await makeRequest(text.id, session.token);
                await context.em.find(Vocab, expectedExistingVocabs, {refresh: true});

                expect(response.statusCode).toEqual(200);
                const responseBody = response.json();
                const expectedBody = [...learnerVocabForTextSerializer.serializeList(expectedExistingMappings), ...vocabForTextSerializer.serializeList(expectedNewVocabs)];
                //ignore order
                expect(responseBody.length).toEqual(expectedBody.length);
                expect(responseBody).toEqual(expect.arrayContaining(expectedBody));
            });
        })
        describe("Texts in collection inherit its privacy setting", () => {
            describe("If collection is private collections, text is private", () => {
                test<TestContext>("If the text is in private collection and the user is a non-author return 404", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: user});
                    const language = await context.languageFactory.createOne();
                    const collection = await context.collectionFactory.createOne({language, isPublic: false})
                    const text = await context.textFactory.createOne({language, collection, isPublic: true});

                    const response = await makeRequest(text.id, session.token);

                    expect(response.statusCode).toEqual(404);
                });
                test<TestContext>("If the text is in private collection and user is author return vocabs in text", async (context) => {
                    const author = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: author});
                    const language = await context.languageFactory.createOne();
                    const collection = await context.collectionFactory.createOne({language, isPublic: false, addedBy: author.profile})
                    const text = await context.textFactory.createOne({language, collection, isPublic: false, addedBy: author.profile});
                    const expectedNewVocabs = await context.vocabFactory.create(3, {language, textsAppearingIn: text});
                    const expectedExistingVocabs = await context.vocabFactory.create(3, {language, textsAppearingIn: text});
                    const expectedExistingMappings = [];
                    for (let vocab of expectedExistingVocabs)
                        expectedExistingMappings.push(context.em.create(MapLearnerVocab, {learner: author.profile, vocab}));
                    await context.em.flush();
                    await context.vocabFactory.create(10, {language});
                    const response = await makeRequest(text.id, session.token);
                    await context.em.find(Vocab, expectedExistingVocabs, {refresh: true});

                    expect(response.statusCode).toEqual(200);
                    const responseBody = response.json();
                    const expectedBody = [...learnerVocabForTextSerializer.serializeList(expectedExistingMappings), ...vocabForTextSerializer.serializeList(expectedNewVocabs)];
                    //ignore order
                    expect(responseBody.length).toEqual(expectedBody.length);
                    expect(responseBody).toEqual(expect.arrayContaining(expectedBody));
                });
            });
            test<TestContext>("If collection is public, text is public", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({language, isPublic: true})
                const text = await context.textFactory.createOne({language, collection, isPublic: false});
                const expectedNewVocabs = await context.vocabFactory.create(3, {language, textsAppearingIn: text});
                const expectedExistingVocabs = await context.vocabFactory.create(3, {language, textsAppearingIn: text});
                const expectedExistingMappings = [];
                for (let vocab of expectedExistingVocabs)
                    expectedExistingMappings.push(context.em.create(MapLearnerVocab, {learner: user.profile, vocab}));
                await context.em.flush();
                await context.vocabFactory.create(10, {language});
                const response = await makeRequest(text.id, session.token);
                await context.em.find(Vocab, expectedExistingVocabs, {refresh: true});

                expect(response.statusCode).toEqual(200);
                const responseBody = response.json();
                const expectedBody = [...learnerVocabForTextSerializer.serializeList(expectedExistingMappings), ...vocabForTextSerializer.serializeList(expectedNewVocabs)]
                //ignore order
                expect(responseBody.length).toEqual(expectedBody.length);
                expect(responseBody).toEqual(expect.arrayContaining(expectedBody));
            });
        });
    });
});
