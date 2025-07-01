import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {faker} from "@faker-js/faker";
import {Notification} from "@/src/models/entities/Notification.js";

/**{@link UserController#deleteUserNotification}*/
describe("DELETE users/me/notifications/{notificationId}/", () => {
    const makeRequest = async (notificationId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "DELETE",
            url: `users/me/notifications/${notificationId}/`,
        };
        return await fetchRequest(options, authToken);
    };

    test<TestContext>("If notification exists delete it for the user and return 204", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const notification = await context.notificationFactory.createOne({recipient: user.profile});

        const response = await makeRequest(notification.id, session.token);
        context.em.clear();

        expect(response.statusCode).toEqual(204);
        expect(await context.em.findOne(Notification, {id: notification.id})).toBeNull();
    });
    test<TestContext>("If notification belongs to another user return 404", async (context) => {
        const user1 = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user1});
        const user2 = await context.userFactory.createOne();
        const notification = await context.notificationFactory.createOne({recipient: user2.profile});

        const response = await makeRequest(notification.id, session.token);

        expect(response.statusCode).toEqual(404);
    });
    test<TestContext>("If notification does not exist return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const response = await makeRequest(faker.datatype.number({min: 100000}), session.token);

        expect(response.statusCode).toEqual(404);
    });
    test<TestContext>("If notificationId is invalid return 400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const response = await makeRequest("invalid", session.token);

        expect(response.statusCode).toEqual(400);
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const notification = await context.notificationFactory.createOne({recipient: user.profile});

        const response = await makeRequest(notification.id);

        expect(response.statusCode).toEqual(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const notification = await context.notificationFactory.createOne({recipient: user.profile});

        const response = await makeRequest(notification.id, session.token);

        expect(response.statusCode).toEqual(403);
    });
});