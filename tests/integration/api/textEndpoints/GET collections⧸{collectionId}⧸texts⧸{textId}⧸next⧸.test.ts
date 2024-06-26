import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/tests/integration/utils.js";
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

    describe("If the collection and text exist and text is not last return redirect to next text in collection", async () => {
        test<TestContext>("If text is public return redirect to next text in collection", async (context) => {
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

            expect(response.statusCode).to.equal(303);
            expect(response.headers.location).toEqual(`${API_ROOT}/texts/${expectedText.id}/`);
        });
        test<TestContext>("If text is not public and user is not author skip text and redirect to next next text in collection", async (context) => {
            const language = await context.languageFactory.createOne();
            const author = await context.userFactory.createOne();
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const collection = await context.collectionFactory.createOne({
                language, addedBy: author.profile,
                texts: [
                    context.textFactory.makeDefinition({language, isPublic: true, addedBy: author.profile}),
                    context.textFactory.makeDefinition({language, isPublic: false, addedBy: author.profile}),
                    context.textFactory.makeDefinition({language, isPublic: true, addedBy: author.profile}),
                    context.textFactory.makeDefinition({language, isPublic: true, addedBy: author.profile})
                ]
            });
            const previousText = collection.texts[0];
            const expectedText = collection.texts[2];

            const response = await makeRequest(collection.id, previousText.id, session.token);

            expect(response.statusCode).to.equal(303);
            expect(response.headers.location).toEqual(`${API_ROOT}/texts/${expectedText.id}/`);
        });
        test<TestContext>("If text is not public and user is author return redirect to next text in collection", async (context) => {
            const language = await context.languageFactory.createOne();
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const collection = await context.collectionFactory.createOne({
                language,
                addedBy: author.profile,
                texts: context.textFactory.makeDefinitions(5, {addedBy: author.profile, language, isPublic: false})
            });
            const previousText = collection.texts[0];
            const expectedText = collection.texts[1];

            const response = await makeRequest(collection.id, previousText.id, session.token);

            expect(response.statusCode).to.equal(303);
            expect(response.headers.location).toEqual(`${API_ROOT}/texts/${expectedText.id}/`);
        });
    });
    test<TestContext>("If the collection does not exist return 404", async (context) => {
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({collection: await context.collectionFactory.createOne({language}), language, isPublic: true});
        const response = await makeRequest(Number(faker.random.numeric(8)), text.id);
        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If the text does not exist return 404", async (context) => {
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({language, texts: context.textFactory.makeDefinitions(5, {language, isPublic: true})});
        const response = await makeRequest(collection.id, Number(faker.random.numeric(8)));

        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If the text is last in collection return 404", async (context) => {
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({language, texts: context.textFactory.makeDefinitions(5, {language, isPublic: true})});
        const previousText = collection.texts[collection.texts.length - 1];

        const response = await makeRequest(collection.id, previousText.id);

        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If the text is last public one in collection and user is not author return 404", async (context) => {
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({
            language,
            texts: [
                ...context.textFactory.makeDefinitions(5, {language, isPublic: true}),
                context.textFactory.makeDefinition({language, isPublic: false})
            ]
        });
        const previousText = collection.texts[collection.texts.length - 2];

        const response = await makeRequest(collection.id, previousText.id);

        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If collection id is invalid return 400", async (context) => {
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({collection: await context.collectionFactory.createOne({language}), language, isPublic: true});

        const response = await makeRequest(faker.random.alpha(8), text.id);
        expect(response.statusCode).to.equal(400);
    });
    test<TestContext>("If text id is invalid return 400", async (context) => {
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({language, texts: context.textFactory.makeDefinitions(5, {language, isPublic: true})});

        const response = await makeRequest(collection.id, faker.random.alpha(8));
        expect(response.statusCode).to.equal(400);
    });
});
