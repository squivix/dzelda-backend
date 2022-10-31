import {describe, expect, test} from "vitest";
import {API_ROOT, app, orm} from "../../../../src/app.js";
import {User} from "../../../../src/models/entities/auth/User.js";
import {UserFactory} from "../../../../src/seeders/factories/UserFactory.js";
import {Profile} from "../../../../src/models/entities/Profile.js";
import falso from "@ngneat/falso";

describe("POST /users", function () {
    const userRepo = orm.em.fork().getRepository(User);
    const profileRepo = orm.em.fork().getRepository(Profile);
    const userFactory = () => new UserFactory(orm.em.fork());
    const signUpRequest = async (payload: object) => {
        return await app.inject({
            method: "POST",
            url: `${API_ROOT}/users/`,
            payload
        });
    };


    test("If all fields are valid a new user should be registered with profile", async () => {
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
                    username: falso.randAlphaNumeric({length: 3}),
                    password: newUser.password,
                    email: newUser.email
                });

                expect(response.statusCode).to.equal(400);
            });
            test("If username is longer than 20 characters return 400", async () => {
                const newUser = userFactory().makeOne();
                const response = await signUpRequest({
                    username: falso.randAlphaNumeric({length: 21}),
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
    });
});