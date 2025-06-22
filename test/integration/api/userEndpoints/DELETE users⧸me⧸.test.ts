import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {User} from "@/src/models/entities/auth/User.js";
import {Profile} from "@/src/models/entities/Profile.js";

/**{@link UserController#deleteAccount}*/
describe("DELETE users/me/", function () {
    const makeRequest = async (authToken?: string) => {
        const options: InjectOptions = {
            method: "DELETE",
            url: `users/me/`
        };
        return await fetchRequest(options, authToken);
    };
    test<TestContext>("If user is logged in delete account and profile associated with it, return 204", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const response = await makeRequest(session.token);
        expect(response.statusCode).to.equal(204);
        expect(await context.em.findOne(User, {id: user.id}, {refresh: true})).toBeNull();
        expect(await context.em.findOne(Profile, {user: user}, {refresh: true})).toBeNull();
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const response = await makeRequest();
        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const response = await makeRequest(session.token);
        expect(response.statusCode).to.equal(403);
    });
});
