import {beforeEach, describe, expect, test} from "vitest";
import {faker} from "@faker-js/faker";
import {User} from "@/src/models/entities/auth/User.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {LanguageFactory} from "@/src/seeders/factories/LanguageFactory.js";
import {Language} from "@/src/models/entities/Language.js";
import {orm} from "@/src/server.js";
import {fetchRequest} from "@/tests/acceptance/api/utils.js";
import {truncateDb} from "@/tests/utils.js";
import {EntityRepository} from "@mikro-orm/core";

// beforeEach(truncateDb);

interface LocalTestContext {
    userFactory: UserFactory;
    languageRepo: EntityRepository<Language>;
    userRepo: EntityRepository<User>;
    profileRepo: EntityRepository<Profile>;
    languageFactory: LanguageFactory;
}

beforeEach<LocalTestContext>((context) => {
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.languageFactory = new LanguageFactory(context.em);
    context.languageRepo = context.em.getRepository(Language);
    context.userRepo = context.em.getRepository(User);
    context.profileRepo = context.em.getRepository(Profile);
});


/**{@link UserController#signUp}*/
describe("POST /users", function () {
    const makeRequest = async (body: object) => {
        return await fetchRequest({
            method: "POST",
            url: `users/`,
            payload: body
        });
    };

    describe("If all fields are valid a new user should be registered with profile and return 201", async () => {
        test<LocalTestContext>("If no initial language is sent, the new user should not be learning any language", async (context) => {
            const newUser = context.userFactory.makeOne();
            const response = await makeRequest({
                username: newUser.username,
                password: newUser.password,
                email: newUser.email
            });

            expect(response.statusCode).to.equal(201);
            expect(response.json()).toEqual(expect.objectContaining(newUser.toObject(["profile"])));

            expect(await context.userRepo.findOne({username: newUser.username})).not.toBeNull();
            expect(await context.profileRepo.findOne({user: {username: newUser.username}})).not.toBeNull();
        });
        test<LocalTestContext>("If initial language is sent new user should be learning language", async (context) => {
            const language = await context.languageFactory.createOne();
            const newUser = context.userFactory.makeOne();
            const response = await makeRequest({
                username: newUser.username,
                password: newUser.password,
                email: newUser.email,
                initialLanguage: language.code
            });
            expect(response.statusCode).to.equal(201);
            expect(response.json()).toEqual(expect.objectContaining(newUser.toObject(["profile"])));

            expect(await context.userRepo.findOne({username: newUser.username})).not.toBeNull();
            expect(await context.profileRepo.findOne({user: {username: newUser.username}})).not.toBeNull();
            expect(await context.languageRepo.findOne({learners: {user: {username: newUser.username}}})).not.toBeNull();
        });
    });
    describe("If required fields are missing return 400", async () => {
        test<LocalTestContext>("If username is missing return 400", async (context) => {
            const newUser = context.userFactory.makeOne();
            const response = await makeRequest({
                password: newUser.password,
                email: newUser.email
            });

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If email is missing return 400", async (context) => {
            const newUser = context.userFactory.makeOne();
            const response = await makeRequest({
                username: newUser.username,
                password: newUser.password,
            });

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If password is missing return 400", async (context) => {
            const newUser = context.userFactory.makeOne();
            const response = await makeRequest({
                username: newUser.username,
                email: newUser.email
            });

            expect(response.statusCode).to.equal(400);
        });
    });

    describe("If fields are invalid return 400", async () => {
        describe("If username is invalid return 400", async () => {
            test<LocalTestContext>("If username is shorter than 4 characters return 400", async (context) => {
                const newUser = context.userFactory.makeOne();
                const response = await makeRequest({
                    username: faker.random.alphaNumeric(3),
                    password: newUser.password,
                    email: newUser.email
                });

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If username is longer than 20 characters return 400", async (context) => {
                const newUser = context.userFactory.makeOne();
                const response = await makeRequest({
                    username: faker.random.alphaNumeric(21),
                    password: newUser.password,
                    email: newUser.email
                });

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If username contains any characters other than A-Z,a-z,_,0-9  return 400", async (context) => {
                const newUser = context.userFactory.makeOne();
                const response = await makeRequest({
                    username: faker.datatype.string(20),
                    password: newUser.password,
                    email: newUser.email
                });

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If username already exists return 400", async (context) => {
                const otherUser = await context.userFactory.createOne();
                const newUser = context.userFactory.makeOne();
                const response = await makeRequest({
                    username: otherUser.username,
                    password: newUser.password,
                    email: newUser.email
                });

                expect(response.statusCode).to.equal(400);
            });
        });
        describe("If email is invalid return 400", async () => {
            test<LocalTestContext>("If email is not a valid email return 400", async (context) => {
                const newUser = context.userFactory.makeOne();
                const response = await makeRequest({
                    username: newUser.username,
                    password: newUser.password,
                    email: faker.random.alphaNumeric(20)
                });
                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If email is longer than 255 characters return 400", async (context) => {
                const newUser = context.userFactory.makeOne();
                const response = await makeRequest({
                    username: newUser.username,
                    password: newUser.password,
                    email: faker.internet.email(faker.random.alpha(257))
                });
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("If password is invalid return 400", async () => {
            test<LocalTestContext>("If password is shorter than 8 characters return 400", async (context) => {
                const newUser = context.userFactory.makeOne();
                const response = await makeRequest({
                    username: newUser.username,
                    password: faker.random.alphaNumeric(7),
                    email: newUser.email
                });
                expect(response.statusCode).to.equal(400);
            });
        });
    });
});