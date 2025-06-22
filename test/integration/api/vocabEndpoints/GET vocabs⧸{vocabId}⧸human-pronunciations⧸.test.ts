import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {faker} from "@faker-js/faker";
import {humanPronunciationDTO} from "@/src/presentation/response/dtos/HumanPronunciation/HumanPronunciationDTO.js";

/**{@link VocabController#getVocabHumanPronunciations}*/
describe("GET /vocabs/{vocabId}/human-pronunciations/", () => {
    const makeRequest = async (vocabId: number | string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `vocabs/${vocabId}/human-pronunciations/`,
        };
        return await fetchRequest(options);
    };

    test<TestContext>("If vocab exists return human pronunciations", async (context) => {
        const language = await context.languageFactory.createOne();
        const vocab = await context.vocabFactory.createOne({language});

        const expectedPronunciations = [
            context.humanPronunciationFactory.makeOne({language, text: vocab.text, parsedText: vocab.text}),
            // context.humanPronunciationFactory.makeOne({
            //     language,
            //     text: `Text that contains vocab: ${vocab.text}. How's about that?`,
            //     parsedText: `text that contains vocab ${vocab.text} how's about that`
            // })
        ];
        await context.em.persistAndFlush(expectedPronunciations);
        await context.humanPronunciationFactory.create(3, {language});

        const response = await makeRequest(vocab.id);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(humanPronunciationDTO.serializeList(expectedPronunciations));
    });
    test<TestContext>("If vocab does not exist return 404", async () => {
        const response = await makeRequest(faker.datatype.number({min: 100000}));
        expect(response.statusCode).to.equal(404);
    });
    test("If vocab id is invalid return 400", async () => {
        const response = await makeRequest(faker.random.alpha(8));
        expect(response.statusCode).to.equal(400);
    });
});
