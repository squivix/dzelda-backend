import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {MapHiderText} from "@/src/models/entities/MapHiderText.js";
import {faker} from "@faker-js/faker";


/**{@link TextController#unhideTextForUser}*/
describe("DELETE users/me/texts/hidden/:textId", () => {
    const makeRequest = async (textId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "DELETE",
            url: `users/me/texts/hidden/${textId}/`
        };
        return await fetchRequest(options, authToken);
    };

    test<TestContext>("If user is logged in and text is hidden by user, unhide it, return 204", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language, hiddenBy:user.profile});

        const response = await makeRequest(text.id, session.token);

        expect(response.statusCode).to.equal(204);
        expect(await context.em.findOne(MapHiderText, {hider: user.profile, text})).toBeNull();
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language, hiddenBy:user.profile});

        const response = await makeRequest(text.id);

        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language, hiddenBy:user.profile});

        const response = await makeRequest(text.id, session.token);

        expect(response.statusCode).to.equal(403);
    });
    test<TestContext>("If textId is invalid return 400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const response = await makeRequest(-1, session.token);

        expect(response.statusCode).to.equal(400);
    });
    test<TestContext>("If text is not found return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const response = await makeRequest(faker.datatype.number({min: 100000}), session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If text is not hidden return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language});

        const response = await makeRequest(text.id, session.token);

        expect(response.statusCode).to.equal(404);
    });
});