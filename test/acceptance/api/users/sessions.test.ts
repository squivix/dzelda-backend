import {describe, expect, test, beforeEach} from "vitest";
import {faker} from "@faker-js/faker";
import {orm, passwordHasher} from "@/src/server.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {Session} from "@/src/models/entities/auth/Session.js";
import {fetchRequest} from "@/test/acceptance/api/utils.js";
import {clearDb} from "@/test/utils.js";

beforeEach(async () => clearDb());

describe("POST /sessions", function () {
    const sessionRepo = orm.em.fork().getRepository(Session);
    const userFactory = () => new UserFactory(orm.em.fork());

    const loginUpRequest = async (payload: object) => {
        return await fetchRequest({
            method: "POST",
            url: `sessions/`,
            payload
        });
    };
    test("If all fields are valid a new session should be created return token", async () => {
        const password = faker.random.alphaNumeric(20);
        const user = await userFactory().createOne({password: await passwordHasher.hash(password)});

        const response = await loginUpRequest({
            username: user.username,
            password: password,
        });

        expect(response.statusCode).to.equal(201);
        const session = await sessionRepo.findOne({user: user});
        expect(session).not.toBeNull();
        if (session != null)
            expect(response.json()).toEqual({authToken: session.token});
    });

    describe("If fields is incorrect return 401", async () => {
        test("If username is incorrect return 401", async () => {
            const password = faker.random.alphaNumeric(20);
            const user = await userFactory().createOne({password: await passwordHasher.hash(password)});

            const response = await loginUpRequest({
                username: faker.random.alphaNumeric(20),
                password: password,
            });
            expect(response.statusCode).to.equal(401);
        });

        test("If password is incorrect return 401", async () => {
            const password = faker.random.alphaNumeric(20);
            const user = await userFactory().createOne({password: await passwordHasher.hash(password)});

            const response = await loginUpRequest({
                username: user.username,
                password: faker.random.alphaNumeric(20),
            });

            expect(response.statusCode).to.equal(401);
        });
    });

});