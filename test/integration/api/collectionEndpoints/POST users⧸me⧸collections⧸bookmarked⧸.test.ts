import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {CollectionBookmark} from "@/src/models/entities/CollectionBookmark.js";
import {faker} from "@faker-js/faker";
import {collectionLoggedInSerializer} from "@/src/presentation/response/serializers/Collection/CollectionLoggedInSerializer.js";

/**{@link CollectionController#addCollectionToUserBookmarks}*/
describe("POST users/me/collections/bookmarked/", function () {
    const makeRequest = async (body: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `users/me/collections/bookmarked/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };

    test<TestContext>("If the collection exists add collection to user's bookmarked collections", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const expectedCollection = await context.collectionFactory.createOne({language});
        await context.collectionRepo.annotateCollectionsWithUserData([expectedCollection], user);

        const response = await makeRequest({collectionId: expectedCollection.id}, session.token);

        expectedCollection.isBookmarked = true;
        expect(response.statusCode).to.equal(201);
        expect(response.json()).toEqual(collectionLoggedInSerializer.serialize(expectedCollection));
        const dbRecord = await context.em.findOne(CollectionBookmark, {bookmarker: user.profile, collection: expectedCollection});
        expect(dbRecord).not.toBeNull();
        expect(collectionLoggedInSerializer.serialize(dbRecord!.collection)).toEqual(collectionLoggedInSerializer.serialize(expectedCollection));
    });
    test<TestContext>("If the collection is already bookmarked do nothing, return 200", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const expectedCollection = await context.collectionFactory.createOne({language, bookmarkers:user.profile});
        await context.collectionRepo.annotateCollectionsWithUserData([expectedCollection], user);

        const response = await makeRequest({collectionId: expectedCollection.id}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(collectionLoggedInSerializer.serialize(expectedCollection));
    });
    describe("If required fields are missing return 400", function () {
        test<TestContext>("If the collectionId is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const response = await makeRequest({}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 400", function () {
        describe("If the collection is invalid return 400", async () => {
            test<TestContext>("If the collectionId is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest({collectionId: faker.random.alpha(10)}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If the collection is not found return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest({collectionId: faker.datatype.number({min: 100000})}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If the collection is not in a language the user is learning return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({language});

                const response = await makeRequest({collectionId: collection.id}, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
    });
    test<TestContext>("If user is not logged in return 401", async () => {
        const response = await makeRequest({});
        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({language});

        const response = await makeRequest({collectionId: collection.id}, session.token);
        expect(response.statusCode).to.equal(403);
    });
});
