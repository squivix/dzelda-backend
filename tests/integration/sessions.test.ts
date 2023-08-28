import {beforeEach, describe, expect, test, TestContext} from "vitest";
import {faker} from "@faker-js/faker";
import {orm} from "@/src/server.js";
import {passwordHasher} from "@/src/utils/security/PasswordHasher.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {Session} from "@/src/models/entities/auth/Session.js";
import {fetchRequest} from "@/tests/integration/utils.js";
import {EntityRepository} from "@mikro-orm/core";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";

interface LocalTestContext extends TestContext {
    sessionRepo: EntityRepository<Session>;
}

beforeEach<LocalTestContext>(async (context) => {
    await orm.getSchemaGenerator().clearDatabase();
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.sessionFactory = new SessionFactory(context.em);
    context.sessionRepo = context.em.getRepository(Session);
});


/**{@link UserController#login}*/
describe("POST sessions/", () => {
    const makeRequest = async (body: object) => {
        return await fetchRequest({
            method: "POST",
            url: `sessions/`,
            payload: body
        });
    };
    test<LocalTestContext>("If all fields are valid a new session should be created return token", async (context) => {
        const password = faker.random.alphaNumeric(20);
        const user = await context.userFactory.createOne({password: await passwordHasher.hash(password)});

        const response = await makeRequest({
            username: user.username,
            password: password,
        });

        expect(response.statusCode).to.equal(201);
        const session = await context.sessionRepo.findOne({user: user});
        expect(session).not.toBeNull();
        if (session != null)
            expect(response.json()).toEqual({authToken: session.token});
    });
    describe("If fields is incorrect return 401", async () => {
        test<LocalTestContext>("If username is incorrect return 401", async (context) => {
            const password = faker.random.alphaNumeric(20);
            const user = await context.userFactory.createOne({password: await passwordHasher.hash(password)});

            const response = await makeRequest({
                username: faker.random.alphaNumeric(20),
                password: password,
            });
            expect(response.statusCode).to.equal(401);
        });

        test<LocalTestContext>("If password is incorrect return 401", async (context) => {
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


/**{@link UserController#logout}*/
describe("DELETE sessions/", () => {
    const makeRequest = async (authToken?: string) => {
        return await fetchRequest({
            method: "DELETE",
            url: `sessions/`
        }, authToken);
    };

    test<LocalTestContext>("If user is logged in return 204", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});

        const response = await makeRequest(session.token);
        expect(response.statusCode).to.equal(204);
        expect(await context.sessionRepo.findOne({token: session.token})).toBeNull();
    });
    test<LocalTestContext>("If session token is invalid return 401", async (context) => {
        const session = context.sessionFactory.makeOne();

        const response = await makeRequest(session.token);
        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const response = await makeRequest();
        expect(response.statusCode).to.equal(401);
    });
});
