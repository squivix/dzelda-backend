import {describe, expect, test, beforeEach} from "vitest";
import {fetchRequest} from "../utils.js";
import {faker} from "@faker-js/faker";
import {UserFactory} from "../../../../src/seeders/factories/UserFactory.js";

import {ProfileFactory} from "../../../../src/seeders/factories/ProfileFactory.js";
import {SessionFactory} from "../../../../src/seeders/factories/SessionFactory.js";
import {InjectOptions} from "light-my-request";
import {orm} from "../../../../src/server.js";
import {clearDb} from "../../../utils.js";

beforeEach(async () => clearDb());

describe("GET /users/:username/profile/", function () {
    const userFactory = () => new UserFactory(orm.em.fork());
    const profileFactory = () => new ProfileFactory(orm.em.fork());
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

    test("test if username does not exist return 404", async () => {
        const response = await getProfileRequest(faker.random.alphaNumeric(20));
        expect(response.statusCode).to.equal(404);
    });
    test("test if username exists and is not public and not authenticated as user return 404", async () => {
        const user = await userFactory().createOne();
        const profile = await profileFactory().createOne({user: user, isPublic: false});
        const response = await getProfileRequest(user.username);
        expect(response.statusCode).to.equal(404);
    });
    test("test if username exists and is public return user profile", async () => {
        const user = await userFactory().createOne();
        const profile = await profileFactory().createOne({user: user, isPublic: true});
        const response = await getProfileRequest(user.username);
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(profile.toObject());
    });
    test("test if username exists and is not public but authenticated as user return user profile", async () => {
        const user = await userFactory().createOne();
        const profile = await profileFactory().createOne({user: user, isPublic: false});
        const session = await sessionFactory().createOne({user: user});

        const response = await getProfileRequest(user.username, session.token);
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(profile.toObject());
    });
});