import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {faker} from "@faker-js/faker";
import {collectionSerializer} from "@/src/presentation/response/serializers/Collection/CollectionSerializer.js";
import {collectionLoggedInSerializer} from "@/src/presentation/response/serializers/Collection/CollectionLoggedInSerializer.js";

/**{@link CollectionController#getCollection}*/
describe("GET collections/{collectionId}/", function () {
    const makeRequest = async (collectionId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `collections/${collectionId}/`,
        };
        return await fetchRequest(options, authToken);
    };

    describe("If the collection exists return the collection", () => {
        test<TestContext>("If the user is not logged in and collection is public return collection and texts without vocab levels", async (context) => {
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({language});

            const response = await makeRequest(collection.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(collectionSerializer.serialize(collection));
        });
        test<TestContext>("If the user is logged in return collection and texts with vocab levels", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const collection = await context.collectionFactory.createOne({language: await context.languageFactory.createOne()});
            await context.collectionRepo.annotateCollectionsWithUserData([collection], user);

            const response = await makeRequest(collection.id, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(collectionLoggedInSerializer.serialize(collection));
        });
        test<TestContext>("If collection is public ignore isPublic status of texts", async (context) => {
            const author = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({
                language,
                texts: [
                    ...context.textFactory.makeDefinitions(3, {
                        addedBy: author.profile,
                        language,
                        isPublic: true,
                        isLastInCollection:false
                    }),
                    ...context.textFactory.makeDefinitions(3, {
                        addedBy: author.profile,
                        language,
                        isPublic: false,
                    }),
                ],
            });

            const response = await makeRequest(collection.id);
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(collectionSerializer.serialize(collection));
        });
    });
    describe("If the collection is private hide it from non-author user", () => {
        test<TestContext>("If the user is not logged in and collection is private return 404", async (context) => {
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({language, isPublic: false});

            const response = await makeRequest(collection.id);

            expect(response.statusCode).to.equal(404);
        });
        test<TestContext>("If the user is not author of private collection return 404", async (context) => {
            const author = await context.userFactory.createOne();
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({language, addedBy: author, isPublic: false});
            await context.collectionRepo.annotateCollectionsWithUserData([collection], user);

            const response = await makeRequest(collection.id, session.token);

            expect(response.statusCode).to.equal(404);
        });
    })
    test<TestContext>("If the collection does not exist return 404", async () => {
        const response = await makeRequest(faker.datatype.number({min: 10000000}));
        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If collection id is invalid return 400", async () => {
        const response = await makeRequest(faker.random.alpha(8));
        expect(response.statusCode).to.equal(400);
    });
});
