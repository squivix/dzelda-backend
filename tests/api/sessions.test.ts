import {beforeEach, describe, expect, test} from "vitest";
import {faker} from "@faker-js/faker";
import {orm, passwordHasher} from "@/src/server.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {Session} from "@/src/models/entities/auth/Session.js";
import {fetchRequest} from "@/tests/api/utils.js";
import {EntityRepository} from "@mikro-orm/core";

// beforeEach(truncateDb);

interface LocalTestContext {
    userFactory: UserFactory;
    sessionRepo: EntityRepository<Session>;
}

beforeEach<LocalTestContext>((context) => {
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.sessionRepo = context.em.getRepository(Session);
});


/**{@link UserController#login}*/
describe("POST /sessions", function () {
    const sessionRepo = orm.em.fork().getRepository(Session);

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
        const session = await sessionRepo.findOne({user: user});
        expect(session).not.toBeNull();
        if (session != null)
            expect(response.json()).toEqual({authToken: session.token});
    });

    describe("If a field is incorrect return 401", async () => {
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