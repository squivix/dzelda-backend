import {describe, expect, test, TestContext} from "vitest";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {Session} from "@/src/models/entities/auth/Session.js";

/**{@link UserController#logout}*/
describe("DELETE sessions/", () => {
    const makeRequest = async (authToken?: string) => {
        return await fetchRequest({
            method: "DELETE",
            url: `sessions/`
        }, authToken);
    };

    test<TestContext>("If user is logged in return 204", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});

        const response = await makeRequest(session.token);
        expect(response.statusCode).to.equal(204);
        expect(await context.em.findOne(Session, {token: session.token})).toBeNull();
    });
    test<TestContext>("If session token is invalid return 401", async (context) => {
        const session = context.sessionFactory.makeOne();

        const response = await makeRequest(session.token);
        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const response = await makeRequest();
        expect(response.statusCode).to.equal(401);
    });
});
