import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/integration/utils.js";
import {CollectionBookmark} from "@/src/models/entities/CollectionBookmark.js";
import {faker} from "@faker-js/faker";

/**{@link CollectionController#removeCollectionFromUserBookmarks}*/
describe("DELETE users/me/collections/bookmarked/{collectionId}", function () {
    const makeRequest = async (collectionId: number, authToken?: string) => {
        const options: InjectOptions = {
            method: "DELETE",
            url: `users/me/collections/bookmarked/${collectionId}/`
        };
        return await fetchRequest(options, authToken);
    };

    test<TestContext>("If user is logged in and is collection is bookmarked delete bookmark, return 204", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({language, bookmarkers: user.profile});

        const response = await makeRequest(collection.id, session.token);

        expect(response.statusCode).to.equal(204);
        expect(await context.em.findOne(CollectionBookmark, {bookmarker: user.profile, collection: collection})).toBeNull();
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({language, bookmarkers: user.profile});

        const response = await makeRequest(collection.id);

        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({language, bookmarkers: user.profile});

        const response = await makeRequest(collection.id, session.token);

        expect(response.statusCode).to.equal(403);
    });
    test<TestContext>("If collectionId is invalid return  400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const response = await makeRequest(-1, session.token);

        expect(response.statusCode).to.equal(400);
    });
    test<TestContext>("If collection is not found return  404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const response = await makeRequest(faker.datatype.number({min: 100000}), session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If collection is not bookmarked return  404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({language});

        const response = await makeRequest(collection.id, session.token);

        expect(response.statusCode).to.equal(404);
    });
});
