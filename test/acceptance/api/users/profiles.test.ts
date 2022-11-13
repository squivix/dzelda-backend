import {beforeEach, describe, expect, test} from "vitest";
import {clearDb} from "@/test/utils.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {orm} from "@/src/server.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/acceptance/api/utils.js";
import {faker} from "@faker-js/faker";

beforeEach(async () => clearDb());

const userFactory = () => new UserFactory(orm.em.fork());
const sessionFactory = () => new SessionFactory(orm.em.fork());

const getProfileRequest = async (username: string, authToken?: string) => {
    const options: InjectOptions = {
        method: "GET",
        url: `users/${username}/profile/`,
    };
    if (authToken)
        options.headers = {authorization: `Token ${authToken}`};
    return await fetchRequest(options);
};

describe(`GET /users/:username/profile/`, function () {
    test("test if username does not exist return 404", async () => {
        const response = await getProfileRequest(faker.random.alphaNumeric(20));
        expect(response.statusCode).to.equal(404);
    });
    test(`test if username exists and is not public and not authenticated as user return 404`, async () => {
        const user = await userFactory().createOne({profile: {isPublic: false}});

        const response = await getProfileRequest(user.username);
        expect(response.statusCode).to.equal(404);
    });
    test(`test if username exists and is public return profile`, async () => {
        const user = await userFactory().createOne({profile: {isPublic: true}});

        const response = await getProfileRequest(user.username);
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(user.profile.toObject());
    });
    test(`test if username exists and is not public but authenticated as user return profile`, async () => {
        const user = await userFactory().createOne({profile: {isPublic: false}});
        const session = await sessionFactory().createOne({user: user});

        const response = await getProfileRequest(user.username, session.token);
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(user.profile.toObject());
    });
    test(`test if username is me and not authenticated as user return 401`, async () => {
        const user = await userFactory().createOne({profile: {isPublic: false}});

        const response = await getProfileRequest("me");
        expect(response.statusCode).to.equal(401);
    });
    test(`test if username is me and authenticated as user return profile`, async () => {
        const user = await userFactory().createOne({profile: {isPublic: false}});
        const session = await sessionFactory().createOne({user: user});

        const response = await getProfileRequest("me", session.token);
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(user.profile.toObject());
    });
});