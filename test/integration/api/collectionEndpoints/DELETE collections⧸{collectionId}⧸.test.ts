import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {buildQueryString, fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {faker} from "@faker-js/faker";

/**{@link CollectionController#deleteCollection}*/
describe("DELETE collections/{collectionId}/", function () {
    describe("DELETE collections/{collectionId}/", function () {
        const makeRequest = async (
            collectionId: number | string,
            queryParams: object = {},
            authToken?: string
        ) => {
            const options: InjectOptions = {
                method: "DELETE",
                url: `collections/${collectionId}/${buildQueryString(queryParams)}`
            };
            return await fetchRequest(options, authToken);
        };

        test<TestContext>("If user is author delete collection and keep texts by default", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({language, addedBy: user.profile});
            const texts = await context.textFactory.create(3, {collection, language, addedBy: user.profile});

            const response = await makeRequest(collection.id, {}, session.token);
            context.em.clear();

            expect(response.statusCode).toEqual(204);

            const dbRecord = await context.collectionRepo.findOne({id: collection.id});
            expect(dbRecord).toBeNull();
            const textRecords = await context.textRepo.find({id: texts.map(t => t.id)});
            expect(textRecords).toHaveLength(texts.length);
            textRecords.forEach(t => expect(t.collection).toBeNull());
        });
        test<TestContext>("If cascadeTexts=true delete collection and its texts", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({language, addedBy: user.profile});
            const texts = await context.textFactory.create(3, {collection, language, addedBy: user.profile});

            const response = await makeRequest(collection.id, {cascadeTexts: true}, session.token);
            context.em.clear();

            expect(response.statusCode).toEqual(204);
            expect(await context.collectionRepo.findOne({id: collection.id})).toBeNull();
            expect(await context.textRepo.find({id: texts.map(t => t.id)})).toHaveLength(0);
        });
        test<TestContext>("If user not logged in return 401", async (context) => {
            const user = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({language, addedBy: user.profile});

            const response = await makeRequest(collection.id);

            expect(response.statusCode).toEqual(401);
        });
        test<TestContext>("If user email is not confirmed return 403", async (context) => {
            const user = await context.userFactory.createOne({isEmailConfirmed: false});
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({language, addedBy: user.profile});

            const response = await makeRequest(collection.id, {}, session.token);

            expect(response.statusCode).toEqual(403);
        });
        test<TestContext>("If collection does not exist return 404", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const response = await makeRequest(faker.datatype.number({min: 100000}), {}, session.token);

            expect(response.statusCode).toEqual(404);
        });
        test<TestContext>("If user is not author of public collection return 403", async (context) => {
            const author = await context.userFactory.createOne();
            const otherUser = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: otherUser});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({language, addedBy: author.profile});

            const response = await makeRequest(collection.id, {}, session.token);

            expect(response.statusCode).toEqual(403);
        });
        test<TestContext>("If collection is private and user is not author return 404", async (context) => {
            const author = await context.userFactory.createOne();
            const otherUser = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: otherUser});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({
                language,
                addedBy: author.profile,
                isPublic: false
            });

            const response = await makeRequest(collection.id, {}, session.token);

            expect(response.statusCode).toEqual(404);
        });
        test<TestContext>("If collectionId is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const response = await makeRequest("invalid", {}, session.token);

            expect(response.statusCode).toEqual(400);
        });
        test<TestContext>("If cascadeTexts query param is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({language, addedBy: user.profile});

            const response = await makeRequest(collection.id, {cascadeTexts: "maybe"}, session.token);

            expect(response.statusCode).toEqual(400);
        });
    });
});