import {beforeEach, describe, expect, test} from "vitest";
import {faker} from "@faker-js/faker";
import {orm} from "@/src/server.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/tests/acceptance/api/utils.js";
import {truncateDb} from "@/tests/utils.js";

// beforeEach(truncateDb);

/**{@link ProfileController#getProfile}*/
describe(`GET users/:username/profile/`, function () {
    const userFactory = () => new UserFactory(orm.em.fork());
    const sessionFactory = () => new SessionFactory(orm.em.fork());

    const makeRequest = async (username: string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/${username}/profile/`,
        };
        if (authToken)
            options.headers = {authorization: `Token ${authToken}`};
        return await fetchRequest(options);
    };

    test("tests if username does not exist return 404", async () => {
        const response = await makeRequest(faker.random.alphaNumeric(20));
        expect(response.statusCode).to.equal(404);
    });
    test(`test if username exists and is not public and not authenticated as user return 404`, async () => {
        const user = await userFactory().createOne({profile: {isPublic: false}});

        const response = await makeRequest(user.username);
        expect(response.statusCode).to.equal(404);
    });
    test(`test if username exists and is public return profile`, async () => {
        const user = await userFactory().createOne({profile: {isPublic: true}});

        const response = await makeRequest(user.username);
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(user.profile.toObject());
    });
    test(`test if username exists and is not public but authenticated as user return profile`, async () => {
        const user = await userFactory().createOne({profile: {isPublic: false}});
        const session = await sessionFactory().createOne({user: user});

        const response = await makeRequest(user.username, session.token);
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(user.profile.toObject());
    });
    test(`test if username is me and not authenticated as user return 401`, async () => {
        const user = await userFactory().createOne({profile: {isPublic: false}});

        const response = await makeRequest("me");
        expect(response.statusCode).to.equal(401);
    });
    test(`test if username is me and authenticated as user return profile`, async () => {
        const user = await userFactory().createOne({profile: {isPublic: false}});
        const session = await sessionFactory().createOne({user: user});

        const response = await makeRequest("me", session.token);
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(user.profile.toObject());
    });
});