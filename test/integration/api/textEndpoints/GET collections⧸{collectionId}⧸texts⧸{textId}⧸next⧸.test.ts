import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {API_ROOT} from "@/src/server.js";
import {faker} from "@faker-js/faker";

/**{@link TextController#getNextTextInCollection}*/
describe("GET collections/{collectionId}/texts/{textId}/next/", () => {
    const makeRequest = async (collectionId: string | number, textId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `collections/${collectionId}/texts/${textId}/next/`,
        };
        return await fetchRequest(options, authToken);
    };
    test<TestContext>("If the collection and text exist and text is not last return redirect to next text in collection", async (context) => {
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({
            language,
            addedBy: author.profile,
            texts: context.textFactory.makeDefinitions(5, {language, addedBy: author.profile, isPublic: true})
        });
        const previousText = collection.texts[0];
        const expectedText = collection.texts[1];

        const response = await makeRequest(collection.id, previousText.id);

        expect(response.statusCode).toEqual(303);
        expect(response.headers.location).toEqual(`${API_ROOT}/texts/${expectedText.id}/`);
    });
    test<TestContext>("If the collection does not exist return 404", async (context) => {
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({collection: await context.collectionFactory.createOne({language}), language, isPublic: true});
        const response = await makeRequest(Number(faker.random.numeric(8)), text.id);
        expect(response.statusCode).toEqual(404);
    });
    describe("If the collection is private hide it from non-author user", () => {
        test<TestContext>("If the user is not logged in and collection is private return 404", async (context) => {
            const author = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({
                language,
                addedBy: author.profile,
                texts: context.textFactory.makeDefinitions(5, {language, addedBy: author.profile, isPublic: true}),
                isPublic: false,
            });
            const previousText = collection.texts[0];

            const response = await makeRequest(collection.id, previousText.id);

            expect(response.statusCode).toEqual(404);
        });
        test<TestContext>("If the user is not author of private collection return 404", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const author = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({
                language,
                addedBy: author.profile,
                texts: context.textFactory.makeDefinitions(5, {language, addedBy: author.profile, isPublic: true}),
                isPublic: false,
            });
            const previousText = collection.texts[0];

            const response = await makeRequest(collection.id, previousText.id, session.token);

            expect(response.statusCode).toEqual(404);
        });
    })

    test<TestContext>("If the text does not exist return 404", async (context) => {
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({language, texts: context.textFactory.makeDefinitions(5, {language, isPublic: true})});
        const response = await makeRequest(collection.id, Number(faker.random.numeric(8)));

        expect(response.statusCode).toEqual(404);
    });
    test<TestContext>("If the text is last in collection return 404", async (context) => {
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({language, texts: context.textFactory.makeDefinitions(5, {language, isPublic: true})});
        const previousText = collection.texts[collection.texts.length - 1];

        const response = await makeRequest(collection.id, previousText.id);

        expect(response.statusCode).toEqual(404);
    });
    test<TestContext>("If collection id is invalid return 400", async (context) => {
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({collection: await context.collectionFactory.createOne({language}), language, isPublic: true});

        const response = await makeRequest(faker.random.alpha(8), text.id);
        expect(response.statusCode).toEqual(400);
    });
    test<TestContext>("If text id is invalid return 400", async (context) => {
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({language, texts: context.textFactory.makeDefinitions(5, {language, isPublic: true})});

        const response = await makeRequest(collection.id, faker.random.alpha(8));
        expect(response.statusCode).toEqual(400);
    });
});
