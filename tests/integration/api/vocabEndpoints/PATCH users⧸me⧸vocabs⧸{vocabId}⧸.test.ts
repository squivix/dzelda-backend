import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {createComparator, fetchRequest} from "@/tests/integration/utils.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {VocabLevel} from "dzelda-common";
import {learnerVocabSerializer} from "@/src/presentation/response/serializers/mappings/LearnerVocabSerializer.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";
import {faker} from "@faker-js/faker";
import {PreferredTranslationLanguageEntry} from "@/src/models/entities/PreferredTranslationLanguageEntry.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {Vocab} from "@/src/models/entities/Vocab.js";

/**{@link VocabController#updateUserVocab}*/
describe("PATCH users/me/vocabs/{vocabId}/", () => {
    const makeRequest = async (vocabId: number | string, body: object, authToken?: string) => {
        const options: InjectOptions = {
            method: "PATCH",
            url: `users/me/vocabs/${vocabId}/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };
    const meaningSortComparator = createComparator(Meaning, [
        {property: "learnersCount", order: "asc"},
        {property: "text", order: "asc"},
        {property: "id", order: "asc"}]
    );
    test<TestContext>("If all fields are valid, the vocab exists and user is learning it update user vocab", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language, learners: user.profile,});
        const updatedMapping = context.em.create(MapLearnerVocab,
            {learner: user.profile, vocab, level: VocabLevel.LEVEL_3, notes: "Vocab note"}, {persist: false});

        const response = await makeRequest(vocab.id, {
            level: updatedMapping.level,
            notes: updatedMapping.notes
        }, session.token);

        const dbRecord = await context.em.findOneOrFail(MapLearnerVocab, {learner: user.profile, vocab});
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(learnerVocabSerializer.serialize(updatedMapping));
        expect(learnerVocabSerializer.serialize(dbRecord)).toEqual(learnerVocabSerializer.serialize(updatedMapping));
    });
    test<TestContext>("If updated vocab level is ignored, delete all meanings saved by user for that vocab", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({});
        const translationLanguage = await context.translationLanguageFactory.createOne();
        const learnerLanguageMapping = context.em.create(MapLearnerLanguage, {learner: user.profile, language});
        context.em.create(PreferredTranslationLanguageEntry, {learnerLanguageMapping, translationLanguage, precedenceOrder: 0});
        await context.em.flush();
        const vocab = await context.vocabFactory.createOne({
            language, learners: user.profile,
            meanings: context.meaningFactory.makeDefinitions(3, {
                learners: [user.profile],
                addedBy: user.profile,
                language: translationLanguage
            }).sort(meaningSortComparator)
        });

        const updatedMapping = context.em.create(MapLearnerVocab,
            {learner: user.profile, vocab, level: VocabLevel.IGNORED, notes: ""}, {persist: false});
        updatedMapping.vocab.meanings.getItems().forEach(m => {
            m.learners.set([]);
            m.learnersCount = 0;
        });
        updatedMapping.vocab.learnerMeanings.set([]);

        const response = await makeRequest(vocab.id, {
            level: updatedMapping.level,
            notes: updatedMapping.notes
        }, session.token);
        await context.em.find(Vocab, vocab, {refresh: true});

        const dbRecord = await context.em.findOneOrFail(MapLearnerVocab, {learner: user.profile, vocab});
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(learnerVocabSerializer.serialize(updatedMapping));
        expect(learnerVocabSerializer.serialize(dbRecord)).toEqual(learnerVocabSerializer.serialize(updatedMapping));
        expect(await context.em.find(MapLearnerMeaning, {learner: user.profile, meaning: {vocab: vocab}})).toEqual([]);
    });
    describe(`If fields are invalid return 400`, async () => {
        test<TestContext>("If level is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const vocab = await context.vocabFactory.createOne({language, learners: user.profile});

            const response = await makeRequest(vocab.id, {level: 7, notes: "Vocab note"}, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<TestContext>("If notes are invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne({learners: user.profile});
            const vocab = await context.vocabFactory.createOne({language, learners: user.profile});

            const response = await makeRequest(vocab.id, {
                level: VocabLevel.LEVEL_3,
                notes: faker.random.alpha(3000)
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
    });
    test<TestContext>(`If vocab does not exist return 404`, async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const response = await makeRequest(faker.datatype.number({min: 100000}), {level: VocabLevel.LEVEL_3}, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>(`If user is not learning vocab return 404`, async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language});

        const response = await makeRequest(vocab.id, {level: VocabLevel.LEVEL_3}, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language, learners: user.profile});

        const response = await makeRequest(vocab.id, {level: VocabLevel.LEVEL_3});

        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const vocab = await context.vocabFactory.createOne({language, learners: user.profile});

        const response = await makeRequest(vocab.id, {level: VocabLevel.LEVEL_3}, session.token);

        expect(response.statusCode).to.equal(403);
    });
});
