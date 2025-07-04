import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {Session} from "@/src/models/entities/auth/Session.js";
import {faker} from "@faker-js/faker";
import {userPrivateSerializer} from "@/src/presentation/response/serializers/User/UserPrivateSerializer.js";
import {userPublicSerializer} from "@/src/presentation/response/serializers/User/UserPublicSerializer.js";

/**{@link UserController#getUser}*/
describe("GET users/{username}/", function () {
    const makeRequest = async (username: "me" | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/${username}/`
        };
        return await fetchRequest(options, authToken);
    };
    test<TestContext>("If username is me and not authenticated return 401", async (context) => {
        await context.userFactory.createOne({profile: {isPublic: true}});

        const response = await makeRequest("me");
        expect(response.statusCode).toEqual(401);
    });
    test<TestContext>("If username is me login session expired, delete session and return 401", async (context) => {
        const user = await context.userFactory.createOne({profile: {isPublic: true}});
        const session = await context.sessionFactory.createOne({user: user, expiresOn: "2020-08-28T16:29:58.311Z"});

        const response = await makeRequest("me", session.token);

        expect(response.statusCode).toEqual(401);
        expect(await context.em.findOne(Session, {id: session.id}, {refresh: true})).toBeNull();
    });
    test<TestContext>("If username is me and authenticated return user with email", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});

        const response = await makeRequest("me", session.token);
        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual(userPrivateSerializer.serialize(user));
    });
    test<TestContext>("If username is same as authenticated as user's return user with email", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});

        const response = await makeRequest(user.username, session.token);
        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual(userPrivateSerializer.serialize(user));
    });
    describe("If profile is not public and not authenticated as user return 404", () => {
        test<TestContext>("If not authenticated return 404", async (context) => {
            const user = await context.userFactory.createOne({profile: {isPublic: false}});

            const response = await makeRequest(user.username);
            expect(response.statusCode).toEqual(404);
        });
        test<TestContext>("If authenticated as other user return 404", async (context) => {
            const user = await context.userFactory.createOne({profile: {isPublic: false}});
            const otherUser = await context.userFactory.createOne({profile: {isPublic: false}});
            const session = await context.sessionFactory.createOne({user: otherUser});

            const response = await makeRequest(user.username, session.token);
            expect(response.statusCode).toEqual(404);
        });
    });
    describe("If profile is public and not user return user without email", () => {
        test<TestContext>("If not authenticated return user without email", async (context) => {
            const user = await context.userFactory.createOne({profile: {isPublic: true}});

            const response = await makeRequest(user.username);
            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual(userPublicSerializer.serialize(user));
        });
        test<TestContext>("If authenticated as other user return user without email", async (context) => {
            const user = await context.userFactory.createOne({profile: {isPublic: true}});
            const otherUser = await context.userFactory.createOne({profile: {isPublic: false}});
            const session = await context.sessionFactory.createOne({user: otherUser});

            const response = await makeRequest(user.username, session.token);
            expect(response.statusCode).toEqual(200);
            expect(response.json()).toEqual(userPublicSerializer.serialize(user));
        });
    });
    test<TestContext>("If username does not exist return 404", async (context) => {
        const response = await makeRequest(faker.random.alpha({count: 20}));
        expect(response.statusCode).toEqual(404);
    });
});
