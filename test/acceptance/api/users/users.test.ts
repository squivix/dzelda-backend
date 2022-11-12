import {describe, expect, test, beforeEach} from "vitest";
import {faker} from "@faker-js/faker";
import {User} from "@/src/models/entities/auth/User.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {LanguageFactory} from "@/src/seeders/factories/LanguageFactory.js";
import {Language} from "@/src/models/entities/Language.js";
import {orm} from "@/src/server.js";
import {fetchRequest} from "@/test/acceptance/api/utils.js";
import {clearDb} from "@/test/utils.js";


beforeEach(async () => clearDb());

describe("POST /users", function () {
    const userRepo = orm.em.fork().getRepository(User);
    const profileRepo = orm.em.fork().getRepository(Profile);
    const languageRepo = orm.em.fork().getRepository(Language);
    const userFactory = () => new UserFactory(orm.em.fork());
    const languageFactory = () => new LanguageFactory(orm.em.fork());

    const signUpRequest = async (payload: object) => {
        return await fetchRequest({
            method: "POST",
            url: `users/`,
            payload
        });
    };

    describe("If all fields are valid a new user should be registered with profile and return 201", async () => {
        test("If no initial language is sent, the new user should not be learning any language", async () => {
            const newUser = userFactory().makeOne();
            const response = await signUpRequest({
                username: newUser.username,
                password: newUser.password,
                email: newUser.email
            });

            expect(response.statusCode).to.equal(201);
            expect(response.json()).toEqual(expect.objectContaining(newUser.toObject()));

            expect(await userRepo.findOne({username: newUser.username})).not.toBeNull();
            expect(await profileRepo.findOne({user: {username: newUser.username}})).not.toBeNull();
        });
        test("If initial language is sent new user should be learning language", async () => {
            const language = await languageFactory().createOne();
            const newUser = userFactory().makeOne();
            const response = await signUpRequest({
                username: newUser.username,
                password: newUser.password,
                email: newUser.email,
                initialLanguage: language.code
            });

            expect(response.statusCode).to.equal(201);
            expect(response.json()).toEqual(expect.objectContaining(newUser.toObject()));

            expect(await userRepo.findOne({username: newUser.username})).not.toBeNull();
            expect(await profileRepo.findOne({user: {username: newUser.username}})).not.toBeNull();
            expect(await languageRepo.findOne({learners: {user: {username: newUser.username}}})).not.toBeNull();
        });
    });
    describe("If required fields are missing return 400", async () => {
        test("If username is missing return 400", async () => {
            const newUser = userFactory().makeOne();
            const response = await signUpRequest({
                password: newUser.password,
                email: newUser.email
            });

            expect(response.statusCode).to.equal(400);
        });
        test("If email is missing return 400", async () => {
            const newUser = userFactory().makeOne();
            const response = await signUpRequest({
                username: newUser.username,
                password: newUser.password,
            });

            expect(response.statusCode).to.equal(400);
        });
        test("If password is missing return 400", async () => {
            const newUser = userFactory().makeOne();
            const response = await signUpRequest({
                username: newUser.username,
                email: newUser.email
            });

            expect(response.statusCode).to.equal(400);
        });
    });

    describe("If fields are invalid return 400", async () => {
        describe("If username is invalid return 400", async () => {
            test("If username is shorter than 4 characters return 400", async () => {
                const newUser = userFactory().makeOne();
                const response = await signUpRequest({
                    username: faker.random.alphaNumeric(3),
                    password: newUser.password,
                    email: newUser.email
                });

                expect(response.statusCode).to.equal(400);
            });
            test("If username is longer than 20 characters return 400", async () => {
                const newUser = userFactory().makeOne();
                const response = await signUpRequest({
                    username: faker.random.alphaNumeric(21),
                    password: newUser.password,
                    email: newUser.email
                });

                expect(response.statusCode).to.equal(400);
            });
            test("If username contains any characters other than A-Z,a-z,_,0-9  return 400", async () => {
                const newUser = userFactory().makeOne();
                const response = await signUpRequest({
                    username: faker.datatype.string(20),
                    password: newUser.password,
                    email: newUser.email
                });

                expect(response.statusCode).to.equal(400);
            });
            test("If username already exists return 400", async () => {
                const otherUser = await userFactory().createOne();
                const newUser = userFactory().makeOne();
                const response = await signUpRequest({
                    username: otherUser.username,
                    password: newUser.password,
                    email: newUser.email
                });

                expect(response.statusCode).to.equal(400);
            });
        });
        describe("If email is invalid return 400", async () => {
            test("If email is not a valid email return 400", async () => {
                const newUser = userFactory().makeOne();
                const response = await signUpRequest({
                    username: newUser.username,
                    password: newUser.password,
                    email: faker.random.alphaNumeric(20)
                });
                expect(response.statusCode).to.equal(400);
            });
            test("If email is longer than 255 characters return 400", async () => {
                const newUser = userFactory().makeOne();
                const response = await signUpRequest({
                    username: newUser.username,
                    password: newUser.password,
                    email: faker.internet.email(faker.random.alpha(257))
                });
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("If password is invalid return 400", async () => {
            test("If password is shorter than 8 characters return 400", async () => {
                const newUser = userFactory().makeOne();
                const response = await signUpRequest({
                    username: newUser.username,
                    password: faker.random.alphaNumeric(7),
                    email: newUser.email
                });
                expect(response.statusCode).to.equal(400);
            });
        });
    });
});