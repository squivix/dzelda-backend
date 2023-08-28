import {beforeEach, describe, expect, test, TestContext, vi} from "vitest";
import {faker} from "@faker-js/faker";
import {User} from "@/src/models/entities/auth/User.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {LanguageFactory} from "@/src/seeders/factories/LanguageFactory.js";
import {Language} from "@/src/models/entities/Language.js";
import {orm} from "@/src/server.js";
import {fetchRequest, parseUrlQueryString} from "@/tests/integration/utils.js";
import {EntityRepository} from "@mikro-orm/core";
import {InjectOptions} from "light-my-request";
import {userSerializer} from "@/src/presentation/response/serializers/entities/UserSerializer.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";
import {BANNED_LITERAL_USERNAMES} from "@/src/validators/userValidator.js";
import {PasswordResetToken} from "@/src/models/entities/auth/PasswordResetToken.js";
import {emailTransporter} from "@/src/nodemailer.config.js";
import crypto from "crypto";
import {DOMAIN_NAME, PASSWORD_RESET_TOKEN_LENGTH} from "@/src/constants.js";
import {expiringTokenHasher} from "@/src/utils/security/ExpiringTokenHasher.js";
import {passwordHasher} from "@/src/utils/security/PasswordHasher.js";
import {Session} from "@/src/models/entities/auth/Session.js";

interface LocalTestContext extends TestContext {
    languageRepo: EntityRepository<Language>;
    userRepo: EntityRepository<User>;
    profileRepo: EntityRepository<Profile>;
    languageFactory: LanguageFactory;
}

beforeEach<LocalTestContext>(async (context) => {
    await orm.getSchemaGenerator().clearDatabase();
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.languageFactory = new LanguageFactory(context.em);
    context.sessionFactory = new SessionFactory(context.em);
    context.languageRepo = context.em.getRepository(Language);
    context.userRepo = context.em.getRepository(User);
    context.profileRepo = context.em.getRepository(Profile);
});


/**{@link UserController#signUp}*/
describe("POST users/", function () {
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
            expect(response.json()).toEqual(userSerializer.serialize(newUser, {ignore: ["profile"]}));

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
            expect(response.json()).toEqual(userSerializer.serialize(newUser, {ignore: ["profile"]}));

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
            test<LocalTestContext>("If username is a banned literal username return 400", async (context) => {
                const newUser = context.userFactory.makeOne();
                const response = await makeRequest({
                    username: faker.helpers.arrayElement(BANNED_LITERAL_USERNAMES),
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

/**{@link UserController#getUser}*/
describe("GET users/:username/", function () {
    const makeRequest = async (username: "me" | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/${username}/`
        };
        return await fetchRequest(options, authToken);
    };
    test<LocalTestContext>("If username is me and not authenticated return 401", async (context) => {
        await context.userFactory.createOne({profile: {isPublic: true}});

        const response = await makeRequest("me");
        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If username is me login session expired, delete session and return 401", async (context) => {
        const user = await context.userFactory.createOne({profile: {isPublic: true}});
        const session = await context.sessionFactory.createOne({user: user, expiresOn: "2020-08-28T16:29:58.311Z"});

        const response = await makeRequest("me", session.token);

        expect(response.statusCode).to.equal(401);
        expect(await context.em.findOne(Session, {id: session.id}, {refresh: true})).toBeNull();
    });
    test<LocalTestContext>("If username is me and authenticated return user with email", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});

        const response = await makeRequest("me", session.token);
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(userSerializer.serialize(user));
    });
    test<LocalTestContext>("If username is not me and authenticated as user return user with email", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});

        const response = await makeRequest(user.username, session.token);
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(userSerializer.serialize(user));
    });
    describe("If profile is not public and not authenticated as user return 404", () => {
        test<LocalTestContext>("If not authenticated return 404", async (context) => {
            const user = await context.userFactory.createOne({profile: {isPublic: false}});

            const response = await makeRequest(user.username);
            expect(response.statusCode).to.equal(404);
        });
        test<LocalTestContext>("If authenticated as other user return 404", async (context) => {
            const user = await context.userFactory.createOne({profile: {isPublic: false}});
            const otherUser = await context.userFactory.createOne({profile: {isPublic: false}});
            const session = await context.sessionFactory.createOne({user: otherUser});

            const response = await makeRequest(user.username, session.token);
            expect(response.statusCode).to.equal(404);
        });
    });
    describe("If profile is public and not user return user without email", () => {
        test<LocalTestContext>("If not authenticated return user without email", async (context) => {
            const user = await context.userFactory.createOne({profile: {isPublic: true}});

            const response = await makeRequest(user.username);
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(userSerializer.serialize(user, {ignore: ["email"]}));
        });
        test<LocalTestContext>("If authenticated as other user return user without email", async (context) => {
            const user = await context.userFactory.createOne({profile: {isPublic: true}});
            const otherUser = await context.userFactory.createOne({profile: {isPublic: false}});
            const session = await context.sessionFactory.createOne({user: otherUser});

            const response = await makeRequest(user.username, session.token);
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(userSerializer.serialize(user, {ignore: ["email"]}));
        });
    });

    test<LocalTestContext>("If username does not exist return 404", async (context) => {
        const response = await makeRequest(faker.random.alpha({count: 20}));
        expect(response.statusCode).to.equal(404);
    });
});

/**{@link UserController#createPasswordResetToken}*/
describe("POST password-reset-tokens/", function () {
    const makeRequest = async (body: object) => {
        return await fetchRequest({
            method: "POST",
            url: `password-reset-tokens/`,
            payload: body
        });
    };

    const resetUrlRegex = new RegExp(`https://${DOMAIN_NAME}/reset-password\\?token=.*`);
    test<LocalTestContext>("If username and email exist and match, create a token, store its hash in the db and send an email with the token, return 204", async (context) => {
        const user = await context.userFactory.createOne();

        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
        const response = await makeRequest({
            username: user.username,
            email: user.email
        });

        const newlyCreatedToken = await context.em.findOne(PasswordResetToken, {user});
        expect(response.statusCode).to.equal(204);

        expect(newlyCreatedToken).not.toBeNull();
        expect(sendMailSpy).toHaveBeenCalledOnce();
        expect(sendMailSpy).toHaveBeenCalledWith(expect.objectContaining({
            text: expect.stringMatching(resetUrlRegex),
            to: user.email
        }));

        const emailText = sendMailSpy.mock.calls[0][0].text as string;
        const resetUrl = emailText.substring(emailText.search(resetUrlRegex));
        expect(sendMailSpy.mock.calls[0][0].html).toMatch(resetUrl);
        const sentToken = parseUrlQueryString(resetUrl)["token"];
        expect(sentToken).toBeDefined();
        expect(await expiringTokenHasher.hash(sentToken)).toEqual(newlyCreatedToken!.token);
    });
    test<LocalTestContext>("If token already exists delete it, create a new  token, store its hash in the db and send an email with the token, return 204", async (context) => {
        const user = await context.userFactory.createOne();
        const oldToken = context.em.create(PasswordResetToken, {
            user: user,
            token: await expiringTokenHasher.hash(crypto.randomBytes(PASSWORD_RESET_TOKEN_LENGTH))
        });
        await context.em.flush();

        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
        const response = await makeRequest({
            username: user.username,
            email: user.email
        });

        const userTokens = await context.em.find(PasswordResetToken, {user});
        expect(response.statusCode).to.equal(204);
        expect(userTokens).toHaveLength(1);
        const newlyCreatedToken = userTokens[0];
        expect(await context.em.findOne(PasswordResetToken, {token: oldToken.token})).toBeNull();
        expect(sendMailSpy).toHaveBeenCalledOnce();
        expect(sendMailSpy).toHaveBeenCalledWith(expect.objectContaining({
            text: expect.stringMatching(resetUrlRegex),
            to: user.email
        }));

        const emailText = sendMailSpy.mock.calls[0][0].text as string;
        const resetUrl = emailText.substring(emailText.search(resetUrlRegex));
        expect(sendMailSpy.mock.calls[0][0].html).toMatch(resetUrl);
        const sentToken = parseUrlQueryString(resetUrl)["token"];
        expect(sentToken).toBeDefined();
        expect(await expiringTokenHasher.hash(sentToken)).toEqual(newlyCreatedToken!.token);
    });
    test<LocalTestContext>("If username and email exist do not exist, do not send an email, return 204", async (context) => {
        const fakeUser = context.userFactory.makeOne();

        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
        const response = await makeRequest({
            username: fakeUser.username,
            email: fakeUser.email
        });

        expect(response.statusCode).to.equal(204);
        expect(sendMailSpy).not.toHaveBeenCalled();
    });
    test<LocalTestContext>("If username and email, do not match, do not create a token or send an email, return 204", async (context) => {
        const user = await context.userFactory.createOne();
        const otherUser = await context.userFactory.createOne();

        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
        const response = await makeRequest({
            username: user.username,
            email: otherUser.email
        });

        expect(response.statusCode).to.equal(204);
        expect(await context.em.findOne(PasswordResetToken, {user})).toBeNull();
        expect(await context.em.findOne(PasswordResetToken, {user: otherUser})).toBeNull();
        expect(sendMailSpy).not.toHaveBeenCalled();
    });
});


/**{@link UserController#validatePasswordResetToken}*/
describe("POST password-reset-tokens/validate/", function () {
    const makeRequest = async (body: object) => {
        return await fetchRequest({
            method: "POST",
            url: `password-reset-tokens/validate/`,
            payload: body
        });
    };
    test<LocalTestContext>("If token is valid return 204", async (context) => {
        const user = await context.userFactory.createOne();
        const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_LENGTH).toString("hex");
        context.em.create(PasswordResetToken, {
            user: user,
            token: await expiringTokenHasher.hash(token)
        });
        await context.em.flush();

        const response = await makeRequest({token: token});
        expect(response.statusCode).to.equal(204);

    });
    test<LocalTestContext>("If token does not exist return 401", async (context) => {
        const response = await makeRequest({token: crypto.randomBytes(PASSWORD_RESET_TOKEN_LENGTH).toString("hex")});

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If token is expired, delete it and return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_LENGTH).toString("hex");
        const resetToken = context.em.create(PasswordResetToken, {
            user: user,
            token: await expiringTokenHasher.hash(token),
            expiresOn: new Date("2020-08-27T07:47:21.575Z")
        });
        await context.em.flush();

        const response = await makeRequest({token: token});

        expect(response.statusCode).to.equal(401);
        expect(await context.em.findOne(PasswordResetToken, {token: resetToken.token}, {refresh: true})).toBeNull();
    });

});

/**{@link UserController#resetPassword}*/
describe("POST users/me/passwords/", function () {
    const makeRequest = async (body: object) => {
        return await fetchRequest({
            method: "POST",
            url: `users/me/passwords/`,
            payload: body
        });
    };
    test<LocalTestContext>("If token is valid and not expired, and password is valid change password, send email, and return 204", async (context) => {
        const user = await context.userFactory.createOne();
        const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_LENGTH).toString("hex");
        context.em.create(PasswordResetToken, {
            user: user,
            token: await expiringTokenHasher.hash(token)
        });
        await context.em.flush();
        const newPassword = faker.random.alphaNumeric(8);
        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");

        const response = await makeRequest({token: token, newPassword: newPassword});
        await context.em.refresh(user);

        expect(response.statusCode).to.equal(204);
        expect(sendMailSpy).toHaveBeenCalledOnce();
        expect(await passwordHasher.validate(newPassword, user.password));
    });
    test<LocalTestContext>("If token does not exist, return 401", async (context) => {
        const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_LENGTH).toString("hex");

        const newPassword = faker.random.alphaNumeric(8);
        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");

        const response = await makeRequest({token: await expiringTokenHasher.hash(token), newPassword: newPassword});

        expect(response.statusCode).to.equal(401);
        expect(sendMailSpy).not.toHaveBeenCalled();
    });

    test<LocalTestContext>("If token is expired, delete it and return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const oldPassword = user.password;
        const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_LENGTH).toString("hex");
        const resetToken = context.em.create(PasswordResetToken, {
            user: user,
            token: await expiringTokenHasher.hash(token),
            expiresOn: new Date("2020-08-27T07:47:21.575Z")
        });
        await context.em.flush();
        const newPassword = faker.random.alphaNumeric(8);
        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");

        const response = await makeRequest({token: token, newPassword: newPassword});
        await context.em.refresh(user);

        expect(response.statusCode).to.equal(401);
        expect(sendMailSpy).not.toHaveBeenCalled();
        expect(user.password).toEqual(oldPassword);
        expect(!await passwordHasher.validate(newPassword, user.password));
        expect(await context.em.findOne(PasswordResetToken, {token: resetToken.token}, {refresh: true})).toBeNull();
    });
    test<LocalTestContext>("If password is invalid return 400", async (context) => {
        const user = await context.userFactory.createOne();
        const oldPassword = user.password;
        const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_LENGTH).toString("hex");
        context.em.create(PasswordResetToken, {
            user: user,
            token: await expiringTokenHasher.hash(token)
        });
        await context.em.flush();
        const newPassword = faker.random.alphaNumeric(7);
        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");

        const response = await makeRequest({token: token, newPassword: newPassword});
        await context.em.refresh(user);

        expect(response.statusCode).to.equal(400);
        expect(sendMailSpy).not.toHaveBeenCalled();
        expect(user.password).toEqual(oldPassword);
        expect(!await passwordHasher.validate(newPassword, user.password));
    });
});

