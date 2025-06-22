import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {createComparator, fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {faker} from "@faker-js/faker";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {meaningSummerySerializer} from "@/src/presentation/response/serializers/Meaning/MeaningSummerySerializer.js";

/**{@link MeaningController#getTextMeanings}*/
describe("GET texts/{textId}/meanings/", () => {
    const makeRequest = async (textId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `texts/${textId}/meanings/`,
        };
        return await fetchRequest(options, authToken);
    };
    const defaultSortComparator = createComparator(Meaning, [
        {property: "vocab", order: "asc", preProcess: (v: Vocab) => v.id},
        {property: "learnersCount", order: "desc"},
        {property: "text", order: "asc", preProcess: (t: string) => t.length},
        {property: "id", order: "asc"}
    ]);
    test<TestContext>("If user is logged in and text exists return all meanings and learner meanings of vocabs in text", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const translationLanguage = await context.translationLanguageFactory.createOne();
        const text = await context.textFactory.createOne({language, isPublic: true});
        const vocabs = await context.vocabFactory.create(2, {language, textsAppearingIn: text});
        const expectedLearnerMeanings = [
            await context.meaningFactory.createOne({vocab: vocabs[0], language: translationLanguage, learners: user.profile}),
            await context.meaningFactory.createOne({vocab: vocabs[1], language: translationLanguage, learners: user.profile}),
        ];
        const expectedMeanings = [
            await context.meaningFactory.createOne({vocab: vocabs[0], language: translationLanguage}),
            await context.meaningFactory.createOne({vocab: vocabs[1], language: translationLanguage}),
            ...expectedLearnerMeanings,
        ];
        expectedMeanings.sort(defaultSortComparator);
        expectedLearnerMeanings.sort(defaultSortComparator);
        const otherText = await context.textFactory.createOne({language, isPublic: true});
        const otherVocab = await context.vocabFactory.createOne({language, textsAppearingIn: otherText});
        await context.meaningFactory.create(3, {vocab: otherVocab, language: translationLanguage});

        const response = await makeRequest(text.id, session.token);
        expect(response.statusCode).to.equal(200);
        const body = response.json();
        expect(body.meanings).toEqual(meaningSummerySerializer.serializeList(expectedMeanings));
        expect(body.learnerMeanings).toEqual(expectedLearnerMeanings.map(m => m.id))
    });
    test<TestContext>("If user is not logged in return meanings of vocabs in text", async (context) => {
        const user1 = await context.userFactory.createOne();
        const user2 = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const translationLanguage = await context.translationLanguageFactory.createOne();
        const text = await context.textFactory.createOne({language, isPublic: true});
        const vocabs = await context.vocabFactory.create(2, {language, textsAppearingIn: text});
        const expectedMeanings = [
            await context.meaningFactory.createOne({vocab: vocabs[0], language: translationLanguage}),
            await context.meaningFactory.createOne({vocab: vocabs[1], language: translationLanguage}),
            await context.meaningFactory.createOne({vocab: vocabs[0], language: translationLanguage, learners: user1.profile}),
            await context.meaningFactory.createOne({vocab: vocabs[1], language: translationLanguage, learners: user2.profile}),
        ];
        expectedMeanings.sort(defaultSortComparator);
        const otherText = await context.textFactory.createOne({language, isPublic: true});
        const otherVocab = await context.vocabFactory.createOne({language, textsAppearingIn: otherText});
        await context.meaningFactory.create(3, {vocab: otherVocab, language: translationLanguage});

        const response = await makeRequest(text.id);
        const body = response.json();
        expect(response.statusCode).to.equal(200);
        expect(body.meanings).toEqual(meaningSummerySerializer.serializeList(expectedMeanings));
        expect(body.learnerMeanings).toBeUndefined();
    });
    test<TestContext>("If text does not exist return 404", async () => {
        const response = await makeRequest(faker.datatype.number({min: 1000000}));
        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If text id is invalid return 400", async () => {
        const response = await makeRequest(faker.random.alpha(8));
        expect(response.statusCode).to.equal(400);
    });

    describe("test privacy", () => {
        describe("Hide private texts from non-authors", () => {
            test<TestContext>("If the text is private and the user is not logged-in return 404", async (context) => {
                const language = await context.languageFactory.createOne();
                const text = await context.textFactory.createOne({language, isPublic: false});

                const response = await makeRequest(text.id);

                expect(response.statusCode).to.equal(404);
            });
            test<TestContext>("If the text is private and the user is non-author return 404", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const text = await context.textFactory.createOne({language, isPublic: false});

                const response = await makeRequest(text.id, session.token);

                expect(response.statusCode).to.equal(404);
            });
            test<TestContext>("If the text is private and the user is author return meanings and learner meanings of vocabs in text", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const translationLanguage = await context.translationLanguageFactory.createOne();
                const text = await context.textFactory.createOne({language, isPublic: false, addedBy: user.profile});
                const vocabs = await context.vocabFactory.create(2, {language, textsAppearingIn: text});
                const expectedLearnerMeanings = [
                    await context.meaningFactory.createOne({vocab: vocabs[0], language: translationLanguage, learners: user.profile}),
                    await context.meaningFactory.createOne({vocab: vocabs[1], language: translationLanguage, learners: user.profile}),
                ];
                const expectedMeanings = [
                    await context.meaningFactory.createOne({vocab: vocabs[0], language: translationLanguage}),
                    await context.meaningFactory.createOne({vocab: vocabs[1], language: translationLanguage}),
                    ...expectedLearnerMeanings,
                ];
                expectedMeanings.sort(defaultSortComparator);
                expectedLearnerMeanings.sort(defaultSortComparator);
                const otherText = await context.textFactory.createOne({language, isPublic: true});
                const otherVocab = await context.vocabFactory.createOne({language, textsAppearingIn: otherText});
                await context.meaningFactory.create(3, {vocab: otherVocab, language: translationLanguage});

                const response = await makeRequest(text.id, session.token);
                expect(response.statusCode).to.equal(200);
                const body = response.json();
                expect(body.meanings).toEqual(meaningSummerySerializer.serializeList(expectedMeanings));
                expect(body.learnerMeanings).toEqual(expectedLearnerMeanings.map(m => m.id))
            });
        })
        describe("Texts in collection inherit its privacy setting", () => {
            describe("If collection is private collections, text is private", () => {
                test<TestContext>("If the text is in private collection and user is not logged-in return 404", async (context) => {
                    const language = await context.languageFactory.createOne();
                    const collection = await context.collectionFactory.createOne({language, isPublic: false})
                    const text = await context.textFactory.createOne({language, collection, isPublic: true});

                    const response = await makeRequest(text.id);

                    expect(response.statusCode).to.equal(404);
                });
                test<TestContext>("If the text is in private collection and user is non-author return 404", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user});
                    const language = await context.languageFactory.createOne();
                    const collection = await context.collectionFactory.createOne({language, isPublic: false})
                    const text = await context.textFactory.createOne({language, collection, isPublic: true});

                    const response = await makeRequest(text.id, session.token);

                    expect(response.statusCode).to.equal(404);
                });
                test<TestContext>("If the text is in private collection and user is author return vocabs in text", async (context) => {
                    const author = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: author.profile});
                    const language = await context.languageFactory.createOne();
                    const translationLanguage = await context.translationLanguageFactory.createOne();
                    const collection = await context.collectionFactory.createOne({language, isPublic: false, addedBy: author.profile})
                    const text = await context.textFactory.createOne({language, collection, isPublic: false, addedBy: author.profile});
                    const vocabs = await context.vocabFactory.create(2, {language, textsAppearingIn: text});
                    const expectedLearnerMeanings = [
                        await context.meaningFactory.createOne({vocab: vocabs[0], language: translationLanguage, learners: author.profile}),
                        await context.meaningFactory.createOne({vocab: vocabs[1], language: translationLanguage, learners: author.profile}),
                    ];
                    const expectedMeanings = [
                        await context.meaningFactory.createOne({vocab: vocabs[0], language: translationLanguage}),
                        await context.meaningFactory.createOne({vocab: vocabs[1], language: translationLanguage}),
                        ...expectedLearnerMeanings,
                    ];
                    expectedMeanings.sort(defaultSortComparator);
                    expectedLearnerMeanings.sort(defaultSortComparator);
                    const otherText = await context.textFactory.createOne({language, isPublic: true});
                    const otherVocab = await context.vocabFactory.createOne({language, textsAppearingIn: otherText});
                    await context.meaningFactory.create(3, {vocab: otherVocab, language: translationLanguage});

                    const response = await makeRequest(text.id, session.token);
                    expect(response.statusCode).to.equal(200);
                    const body = response.json();
                    expect(body.meanings).toEqual(meaningSummerySerializer.serializeList(expectedMeanings));
                    expect(body.learnerMeanings).toEqual(expectedLearnerMeanings.map(m => m.id))
                });
            });
            test<TestContext>("If collection is public, text is public", async (context) => {
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();
                const language = await context.languageFactory.createOne();
                const translationLanguage = await context.translationLanguageFactory.createOne();
                const collection = await context.collectionFactory.createOne({language, isPublic: true});
                const text = await context.textFactory.createOne({language, collection, isPublic: false});
                const vocabs = await context.vocabFactory.create(2, {language, textsAppearingIn: text});
                const expectedMeanings = [
                    await context.meaningFactory.createOne({vocab: vocabs[0], language: translationLanguage}),
                    await context.meaningFactory.createOne({vocab: vocabs[1], language: translationLanguage}),
                    await context.meaningFactory.createOne({vocab: vocabs[0], language: translationLanguage, learners: user1.profile}),
                    await context.meaningFactory.createOne({vocab: vocabs[1], language: translationLanguage, learners: user2.profile}),
                ];
                expectedMeanings.sort(defaultSortComparator);
                const otherText = await context.textFactory.createOne({language, isPublic: true});
                const otherVocab = await context.vocabFactory.createOne({language, textsAppearingIn: otherText});
                await context.meaningFactory.create(3, {vocab: otherVocab, language: translationLanguage});

                const response = await makeRequest(text.id);
                const body = response.json();
                expect(response.statusCode).to.equal(200);
                expect(body.meanings).toEqual(meaningSummerySerializer.serializeList(expectedMeanings));
                expect(body.learnerMeanings).toBeUndefined();
            });
        });
    });
});