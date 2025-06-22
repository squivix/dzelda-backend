import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {MapHiderText} from "@/src/models/entities/MapHiderText.js";
import {faker} from "@faker-js/faker";

/**{@link TextController#hideTextForUser}*/
describe("POST users/me/texts/hidden/", () => {
    const makeRequest = async (body: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `users/me/texts/hidden/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };

    test<TestContext>("If the text exists hide text for user", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language});

        const response = await makeRequest({textId: text.id}, session.token);

        expect(response.statusCode).to.equal(204);
        expect(await context.em.findOne(MapHiderText, {hider: user.profile, text})).not.toBeNull();
    });
    test<TestContext>("If text is already hidden return 400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language, hiddenBy: user.profile});

        const response = await makeRequest({textId: text.id}, session.token);

        expect(response.statusCode).to.equal(400);
    });
    test<TestContext>("If text does not exist return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const response = await makeRequest({textId: faker.datatype.number({min: 100000})}, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If text was created by user themselves return 400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language, addedBy: user.profile});

        const response = await makeRequest({textId: text.id}, session.token);

        expect(response.statusCode).to.equal(400);
    });
    test<TestContext>("If textId is missing return 400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const response = await makeRequest({}, session.token);

        expect(response.statusCode).to.equal(400);
    });
    test<TestContext>("If textId is invalid return 400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const response = await makeRequest({textId: faker.random.alpha(10)}, session.token);

        expect(response.statusCode).to.equal(400);
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language});

        const response = await makeRequest({textId: text.id});

        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language});

        const response = await makeRequest({textId: text.id}, session.token);

        expect(response.statusCode).to.equal(403);
    });
});
