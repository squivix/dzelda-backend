import {describe, expect, test, TestContext} from "vitest";
import {fetchRequest} from "@/tests/integration/utils.js";
import {faker} from "@faker-js/faker";
import {passwordHasher} from "@/src/utils/security/PasswordHasher.js";
import {Session} from "@/src/models/entities/auth/Session.js";

/**{@link UserController#login}*/
describe("POST sessions/", () => {
    const makeRequest = async (body: object) => {
        return await fetchRequest({
            method: "POST",
            url: `sessions/`,
            payload: body
        });
    };
    test<TestContext>("If all fields are valid a new session should be created, user last login updated, return token", async (context) => {
        const password = faker.random.alphaNumeric(20);
        const user = await context.userFactory.createOne({password: await passwordHasher.hash(password)});

        const response = await makeRequest({
            username: user.username,
            password: password,
        });
        await context.em.refresh(user);

        expect(response.statusCode).to.equal(201);
        const session = await context.em.findOne(Session, {user: user});
        expect(session).not.toBeNull();
        expect(response.json()).toEqual({authToken: session!.token});
        expect(user.lastLogin).not.toBeNull();
        expect(Math.abs(new Date().getTime() - user.lastLogin!.getTime())).toBeLessThan(3000);
    });
    describe("If fields is incorrect return 401", async () => {
        test<TestContext>("If username is incorrect return 401", async (context) => {
            const password = faker.random.alphaNumeric(20);
            await context.userFactory.createOne({password: await passwordHasher.hash(password)});

            const response = await makeRequest({
                username: faker.random.alphaNumeric(20),
                password: password,
            });
            expect(response.statusCode).to.equal(401);
        });
        test<TestContext>("If password is incorrect return 401", async (context) => {
            const password = faker.random.alphaNumeric(20);
            const user = await context.userFactory.createOne({password: await passwordHasher.hash(password)});

            const response = await makeRequest({
                username: user.username,
                password: faker.random.alphaNumeric(20),
            });

            expect(response.statusCode).to.equal(401);
        });
    });
});
