import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {Text} from "@/src/models/entities/Text.js";
import {faker} from "@faker-js/faker";

/**{@link TextController#deleteText}*/
describe("DELETE texts/{textId}/", () => {
    const makeRequest = async (textId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "DELETE",
            url: `texts/${textId}/`,
        };
        return await fetchRequest(options, authToken);
    };

    test<TestContext>("If text exists and user is author delete text and return 204", async (context) => {
        const author = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: author});
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language, addedBy: author.profile});

        const response = await makeRequest(text.id, session.token);
        context.em.clear();

        expect(response.statusCode).to.equal(204);
        expect(await context.em.findOne(Text, {id: text.id})).toBeNull();
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language, addedBy: author.profile});

        const response = await makeRequest(text.id);

        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language, addedBy: user.profile});

        const response = await makeRequest(text.id, session.token);

        expect(response.statusCode).to.equal(403);
    });
    test<TestContext>("If text does not exist return 404", async (context) => {
        const author = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: author});

        const response = await makeRequest(faker.datatype.number({min: 100000}), session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If text is not public and user is not author return 404", async (context) => {
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language, addedBy: author.profile, isPublic: false});
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: otherUser});

        const response = await makeRequest(text.id, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If text is public and user is not author return 403", async (context) => {
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language, addedBy: author.profile, isPublic: true});
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: otherUser});

        const response = await makeRequest(text.id, session.token);

        expect(response.statusCode).to.equal(403);
    });
    test<TestContext>("If text id is invalid return 400", async (context) => {
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: otherUser});

        const response = await makeRequest(faker.random.alpha(8), session.token);

        expect(response.statusCode).to.equal(400);
    });
});