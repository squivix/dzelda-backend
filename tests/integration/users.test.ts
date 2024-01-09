import {beforeEach, describe, expect, test, TestContext, vi} from "vitest";
import {faker} from "@faker-js/faker";
import {User} from "@/src/models/entities/auth/User.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {LanguageFactory} from "@/src/seeders/factories/LanguageFactory.js";
import {Language} from "@/src/models/entities/Language.js";
import {orm} from "@/src/server.js";
import {fetchRequest, fetchWithFiles, mockValidateFileFields, parseUrlQueryString, readSampleFile} from "@/tests/integration/utils.js";
import {EntityRepository} from "@mikro-orm/core";
import {InjectOptions} from "light-my-request";
import {userSerializer} from "@/src/presentation/response/serializers/entities/UserSerializer.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";
import {BANNED_LITERAL_USERNAMES} from "@/src/validators/userValidator.js";
import {PasswordResetToken} from "@/src/models/entities/auth/PasswordResetToken.js";
import {emailTransporter} from "@/src/nodemailer.config.js";
import crypto from "crypto";
import {DOMAIN_NAME, EMAIL_CONFIRM_TOKEN_LENGTH, PASSWORD_RESET_TOKEN_LENGTH} from "@/src/constants.js";
import {expiringTokenHasher} from "@/src/utils/security/ExpiringTokenHasher.js";
import {passwordHasher} from "@/src/utils/security/PasswordHasher.js";
import {Session} from "@/src/models/entities/auth/Session.js";
import {EmailConfirmationToken} from "@/src/models/entities/auth/EmailConfirmationToken.js";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";
import {profileSerializer} from "@/src/presentation/response/serializers/entities/ProfileSerializer.js";
import {ProfileSchema} from "dzelda-common";
import fs from "fs-extra";
import * as fileValidatorExports from "@/src/validators/fileValidator.js";

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
    context.profileFactory = new ProfileFactory(context.em);
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
    const confirmUrlRegex = new RegExp(`https://${DOMAIN_NAME}/confirm-email\\?token=.*`);
    test<LocalTestContext>("If all fields are valid a new user should be registered with profile, and a confirmation link should be sent to their email and return 201", async (context) => {
        const newUserData = context.userFactory.makeOne({isEmailConfirmed: false});
        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");

        const response = await makeRequest({
            username: newUserData.username,
            password: newUserData.password,
            email: newUserData.email
        });
        expect(response.statusCode).to.equal(201);
        expect(response.json()).toEqual(userSerializer.serialize(newUserData, {ignore: ["profile"]}));

        const newUser = await context.em.findOne(User, {username: newUserData.username}, {populate: ["profile"]});
        expect(newUser).not.toBeNull();
        expect(newUser!.profile).not.toBeNull();
        expect(newUser!.isEmailConfirmed).to.equal(false);
        const emailConfirmToken = await context.em.findOne(EmailConfirmationToken, {user: newUser});
        expect(emailConfirmToken).not.toBeNull();
        expect(sendMailSpy).toHaveBeenCalledOnce();
        expect(sendMailSpy).toHaveBeenCalledWith(expect.objectContaining({
            text: expect.stringMatching(confirmUrlRegex),
            to: newUserData.email
        }));
        const emailText = sendMailSpy.mock.calls[0][0].text as string;
        const confirmUrl = emailText.substring(emailText.search(confirmUrlRegex));
        expect(sendMailSpy.mock.calls[0][0].html).toMatch(confirmUrl);
        const sentToken = parseUrlQueryString(confirmUrl)["token"];
        expect(sentToken).toBeDefined();
        expect(await expiringTokenHasher.hash(sentToken)).toEqual(emailConfirmToken!.token);
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
            test<LocalTestContext>("If email is not unique return 400", async (context) => {
                const otherUser = await context.userFactory.createOne();
                const newUser = context.userFactory.makeOne({email: otherUser.email});
                const response = await makeRequest({
                    username: newUser.username,
                    password: newUser.password,
                    email: newUser.email
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
            expect(response.json()).toEqual(userSerializer.serialize(user, {ignore: ["email", "isEmailConfirmed", "isPendingEmailChange"]}));
        });
        test<LocalTestContext>("If authenticated as other user return user without email", async (context) => {
            const user = await context.userFactory.createOne({profile: {isPublic: true}});
            const otherUser = await context.userFactory.createOne({profile: {isPublic: false}});
            const session = await context.sessionFactory.createOne({user: otherUser});

            const response = await makeRequest(user.username, session.token);
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(userSerializer.serialize(user, {ignore: ["email", "isEmailConfirmed", "isPendingEmailChange"]}));
        });
    });
    test<LocalTestContext>("If username does not exist return 404", async (context) => {
        const response = await makeRequest(faker.random.alpha({count: 20}));
        expect(response.statusCode).to.equal(404);
    });
});

/**{@link UserController#deleteAccount}*/
describe("DELETE users/me/", function () {
    const makeRequest = async (authToken?: string) => {
        const options: InjectOptions = {
            method: "DELETE",
            url: `users/me/`
        };
        return await fetchRequest(options, authToken);
    };
    test<LocalTestContext>("If user is logged in delete account and profile associated with it, return 204", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const response = await makeRequest(session.token);
        expect(response.statusCode).to.equal(204);
        expect(await context.em.findOne(User, {id: user.id})).toBeNull();
        expect(await context.em.findOne(Profile, {user: user})).toBeNull();
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const response = await makeRequest();
        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const response = await makeRequest(session.token);
        expect(response.statusCode).to.equal(403);
    });
});

/**{@link UserController#confirmEmail}*/
describe("POST users/me/email/confirm", function () {
    const makeRequest = async (body: object) => {
        return await fetchRequest({
            method: "POST",
            url: `users/me/email/confirm/`,
            payload: body
        });
    };
    describe("If token is valid and not expired, use it to confirm user email", async (context) => {
        test<LocalTestContext>("If token is from first time sign up set isEmailConfirmed to true, delete token and return 204", async (context) => {
            const user = await context.userFactory.createOne({isEmailConfirmed: false});
            const token = crypto.randomBytes(EMAIL_CONFIRM_TOKEN_LENGTH).toString("hex");
            context.em.create(EmailConfirmationToken, {
                user: user,
                token: await expiringTokenHasher.hash(token),
                email: user.email
            });
            await context.em.flush();

            const response = await makeRequest({token: token});
            await context.em.refresh(user);

            expect(response.statusCode).to.equal(204);
            expect(user.isEmailConfirmed).to.equal(true);
            expect(await context.em.findOne(EmailConfirmationToken, {token: token}, {refresh: true})).toBeNull();
        });
        test<LocalTestContext>("If token is from email change, update user email to new confirmed email from token, delete token and return 204", async (context) => {
            const user = await context.userFactory.createOne({isEmailConfirmed: true});
            const newEmail = context.userFactory.makeDefinition().email!;
            const token = crypto.randomBytes(EMAIL_CONFIRM_TOKEN_LENGTH).toString("hex");
            context.em.create(EmailConfirmationToken, {
                user: user,
                token: await expiringTokenHasher.hash(token),
                email: newEmail
            });
            await context.em.flush();

            const response = await makeRequest({token: token});
            await context.em.refresh(user);

            expect(response.statusCode).to.equal(204);
            expect(user.email).toEqual(newEmail);
            expect(await context.em.findOne(EmailConfirmationToken, {token: token}, {refresh: true})).toBeNull();
        });
    });
    test<LocalTestContext>("If token does not exist, return 401", async (context) => {
        const token = crypto.randomBytes(EMAIL_CONFIRM_TOKEN_LENGTH).toString("hex");
        const response = await makeRequest({token: await expiringTokenHasher.hash(token)});

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If token is expired, delete it and return 401", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const token = crypto.randomBytes(EMAIL_CONFIRM_TOKEN_LENGTH).toString("hex");
        context.em.create(EmailConfirmationToken, {
            user: user,
            token: await expiringTokenHasher.hash(token),
            expiresOn: new Date("2020-08-27T07:47:21.575Z"),
            email: user.email
        });
        await context.em.flush();

        const response = await makeRequest({token: token});
        await context.em.refresh(user);

        expect(response.statusCode).to.equal(401);
        expect(user.isEmailConfirmed).toEqual(false);
        expect(await context.em.findOne(EmailConfirmationToken, {token: token}, {refresh: true})).toBeNull();
    });
});

/**{@link UserController#requestEmailConfirmation}*/
describe("POST email-confirm-tokens/", function () {
    const makeRequest = async (body: object, authToken?: string) => {
        return await fetchRequest({
            method: "POST",
            url: `email-confirm-tokens/`,
            payload: body
        }, authToken);
    };
    const confirmUrlRegex = new RegExp(`https://${DOMAIN_NAME}/confirm-email\\?token=.*`);

    describe("If user is logged in, email is not confirmed, create a token, store its hash in the db and send an email with the token, return 204", async () => {
        test<LocalTestContext>("If new email is not provided, use current unconfirmed user email", async (context) => {
            const user = await context.userFactory.createOne({isEmailConfirmed: false});
            const session = await context.sessionFactory.createOne({user});

            const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
            const response = await makeRequest({}, session.token);

            const newlyCreatedToken = await context.em.findOne(EmailConfirmationToken, {user});
            expect(response.statusCode).to.equal(204);
            expect(newlyCreatedToken).not.toBeNull();
            expect(sendMailSpy).toHaveBeenCalledOnce();
            expect(sendMailSpy).toHaveBeenCalledWith(expect.objectContaining({
                text: expect.stringMatching(confirmUrlRegex),
                to: user.email
            }));

            const emailText = sendMailSpy.mock.calls[0][0].text as string;
            const confirmUrl = emailText.substring(emailText.search(confirmUrlRegex));
            expect(sendMailSpy.mock.calls[0][0].html).toMatch(confirmUrl);
            const sentToken = parseUrlQueryString(confirmUrl)["token"];
            expect(sentToken).toBeDefined();
            expect(await expiringTokenHasher.hash(sentToken)).toEqual(newlyCreatedToken!.token);
        });
        test<LocalTestContext>("If new email is provided, use new email, update unconfirmed user email to new email", async (context) => {
            const user = await context.userFactory.createOne({isEmailConfirmed: false});
            const newEmail = context.userFactory.makeDefinition().email;
            const session = await context.sessionFactory.createOne({user});

            const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
            const response = await makeRequest({email: newEmail}, session.token);
            await context.em.refresh(user);

            const newlyCreatedToken = await context.em.findOne(EmailConfirmationToken, {user});
            expect(response.statusCode).to.equal(204);
            expect(user.email).toEqual(newEmail);
            expect(user.isEmailConfirmed).toEqual(false);
            expect(newlyCreatedToken).not.toBeNull();
            expect(sendMailSpy).toHaveBeenCalledOnce();
            expect(sendMailSpy).toHaveBeenCalledWith(expect.objectContaining({
                text: expect.stringMatching(confirmUrlRegex),
                to: user.email
            }));

            const emailText = sendMailSpy.mock.calls[0][0].text as string;
            const confirmUrl = emailText.substring(emailText.search(confirmUrlRegex));
            expect(sendMailSpy.mock.calls[0][0].html).toMatch(confirmUrl);
            const sentToken = parseUrlQueryString(confirmUrl)["token"];
            expect(sentToken).toBeDefined();
            expect(await expiringTokenHasher.hash(sentToken)).toEqual(newlyCreatedToken!.token);
        });
    });
    test<LocalTestContext>("If token already exists delete it, create a new  token, store its hash in the db and send an email with the token, return 204", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const oldToken = context.em.create(EmailConfirmationToken, {
            user: user,
            token: await expiringTokenHasher.hash(crypto.randomBytes(PASSWORD_RESET_TOKEN_LENGTH)),
            email: user.email
        });
        await context.em.flush();

        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
        const response = await makeRequest({}, session.token);

        const newlyCreatedToken = await context.em.findOne(EmailConfirmationToken, {user});
        expect(response.statusCode).to.equal(204);
        expect(await context.em.findOne(EmailConfirmationToken, {token: oldToken.token})).toBeNull();
        expect(newlyCreatedToken).not.toBeNull();
        expect(sendMailSpy).toHaveBeenCalledOnce();
        expect(sendMailSpy).toHaveBeenCalledWith(expect.objectContaining({
            text: expect.stringMatching(confirmUrlRegex),
            to: user.email
        }));

        const emailText = sendMailSpy.mock.calls[0][0].text as string;
        const confirmUrl = emailText.substring(emailText.search(confirmUrlRegex));
        expect(sendMailSpy.mock.calls[0][0].html).toMatch(confirmUrl);
        const sentToken = parseUrlQueryString(confirmUrl)["token"];
        expect(sentToken).toBeDefined();
        expect(await expiringTokenHasher.hash(sentToken)).toEqual(newlyCreatedToken!.token);
    });
    test<LocalTestContext>("If email is already confirmed, do not create a token, do not send an email, return 400", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: true});
        const session = await context.sessionFactory.createOne({user});

        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
        const response = await makeRequest({}, session.token);

        expect(response.statusCode).to.equal(400);
        expect(await context.em.findOne(EmailConfirmationToken, {user})).toBeNull();
        expect(sendMailSpy).not.toHaveBeenCalled();
    });
    describe("If new email is invalid return 400", async (context) => {
        test<LocalTestContext>("If email is not a valid email return 400", async (context) => {
            const user = await context.userFactory.createOne({isEmailConfirmed: false});
            const session = await context.sessionFactory.createOne({user});

            const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
            const response = await makeRequest({email: faker.random.alpha(8)}, session.token);

            expect(response.statusCode).to.equal(400);
            expect(await context.em.findOne(EmailConfirmationToken, {user})).toBeNull();
            expect(sendMailSpy).not.toHaveBeenCalled();
        });
        test<LocalTestContext>("If email is longer than 255 characters return 400", async (context) => {
            const user = await context.userFactory.createOne({isEmailConfirmed: false});
            const session = await context.sessionFactory.createOne({user});

            const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
            const response = await makeRequest({email: faker.internet.email(faker.random.alpha(257))}, session.token);

            expect(response.statusCode).to.equal(400);
            expect(await context.em.findOne(EmailConfirmationToken, {user})).toBeNull();
            expect(sendMailSpy).not.toHaveBeenCalled();
        });
        test<LocalTestContext>("If email is not unique return 400", async (context) => {
            const user = await context.userFactory.createOne({isEmailConfirmed: false});
            const otherUser = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
            const response = await makeRequest({email: otherUser.email}, session.token);

            expect(response.statusCode).to.equal(400);
            expect(await context.em.findOne(EmailConfirmationToken, {user})).toBeNull();
            expect(sendMailSpy).not.toHaveBeenCalled();
        });
    });

    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const response = await makeRequest({});

        expect(response.statusCode).to.equal(401);
    });

});

/**{@link UserController#requestPasswordReset}*/
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

/**{@link UserController#verifyPasswordResetToken}*/
describe("POST password-reset-tokens/verify/", function () {
    const makeRequest = async (body: object) => {
        return await fetchRequest({
            method: "POST",
            url: `password-reset-tokens/verify/`,
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
describe("POST users/me/password/reset/", function () {
    const makeRequest = async (body: object) => {
        return await fetchRequest({
            method: "POST",
            url: `users/me/password/reset/`,
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
        expect(await passwordHasher.validate(newPassword, user.password)).toBeTruthy();
        expect(sendMailSpy).toHaveBeenCalledOnce();
        expect(sendMailSpy).toHaveBeenCalledWith(expect.objectContaining({to: user.email}));
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
        expect(await passwordHasher.validate(newPassword, user.password)).not.toBeTruthy();
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
        expect(await passwordHasher.validate(newPassword, user.password)).not.toBeTruthy();
    });
});

/**{@link UserController#changeUserEmail}*/
describe("PUT users/me/email/", function () {
    const makeRequest = async (body: object, authToken?: string) => {
        return await fetchRequest({
            method: "PUT",
            url: `users/me/email/`,
            payload: body
        }, authToken);
    };

    const confirmUrlRegex = new RegExp(`https://${DOMAIN_NAME}/confirm-email\\?token=.*`);
    test<LocalTestContext>("If user is logged in and new email is valid generate confirmation token with new email and send confirmation to new email, return 204", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const newEmail = context.userFactory.makeOne().email;
        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");

        const response = await makeRequest({newEmail: newEmail}, session.token);

        await context.em.refresh(user);
        expect(response.statusCode).to.equal(204);
        const emailConfirmToken = await context.em.findOne(EmailConfirmationToken, {user});
        expect(emailConfirmToken).not.toBeNull();
        expect(emailConfirmToken!.email).toEqual(newEmail);
        expect(sendMailSpy).toHaveBeenCalledOnce();
        expect(sendMailSpy).toHaveBeenCalledWith(expect.objectContaining({text: expect.stringMatching(confirmUrlRegex), to: newEmail}));
        const emailText = sendMailSpy.mock.calls[0][0].text as string;
        const confirmUrl = emailText.substring(emailText.search(confirmUrlRegex));
        expect(sendMailSpy.mock.calls[0][0].html).toMatch(confirmUrl);
        const sentToken = parseUrlQueryString(confirmUrl)["token"];
        expect(sentToken).toBeDefined();
        expect(await expiringTokenHasher.hash(sentToken)).toEqual(emailConfirmToken!.token);
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const newEmail = context.userFactory.makeOne().email;

        const response = await makeRequest({newEmail: newEmail});

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const newEmail = context.userFactory.makeOne().email;

        const response = await makeRequest({newEmail: newEmail}, session.token);

        expect(response.statusCode).to.equal(403);
    });
    describe("If new email is invalid return 400", async (context) => {
        test<LocalTestContext>("If email is not a valid email return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const oldEmail = user.email;
            const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");

            const response = await makeRequest({newEmail: faker.random.alpha(8)}, session.token);

            await context.em.refresh(user);
            expect(response.statusCode).to.equal(400);
            expect(user.email).to.equal(oldEmail);
            expect(await context.em.findOne(EmailConfirmationToken, {user})).toBeNull();
            expect(sendMailSpy).not.toHaveBeenCalled();
        });
        test<LocalTestContext>("If email is longer than 255 characters return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const oldEmail = user.email;
            const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");

            const response = await makeRequest({newEmail: faker.internet.email(faker.random.alpha(257))}, session.token);

            await context.em.refresh(user);
            expect(response.statusCode).to.equal(400);
            expect(user.email).to.equal(oldEmail);
            expect(await context.em.findOne(EmailConfirmationToken, {user})).toBeNull();
            expect(sendMailSpy).not.toHaveBeenCalled();
        });
        test<LocalTestContext>("If email is not unique return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const otherUser = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const oldEmail = user.email;
            const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");

            const response = await makeRequest({newEmail: otherUser.email}, session.token);

            await context.em.refresh(user);
            expect(response.statusCode).to.equal(400);
            expect(user.email).to.equal(oldEmail);
            expect(await context.em.findOne(EmailConfirmationToken, {user})).toBeNull();
            expect(sendMailSpy).not.toHaveBeenCalled();
        });
    });
});

/**{@link UserController#changeUserPassword}*/
describe("PUT users/me/password/", function () {
    const makeRequest = async (body: object, authToken?: string) => {
        return await fetchRequest({
            method: "PUT",
            url: `users/me/password/`,
            payload: body
        }, authToken);
    };

    test<LocalTestContext>("If user is logged in, old password matches and new password is valid change password, delete all other sessions, send notification email, return 204", async (context) => {
        const oldPassword = faker.random.alphaNumeric(10);
        const user = await context.userFactory.createOne({password: await passwordHasher.hash(oldPassword)});
        const session = await context.sessionFactory.createOne({user});
        const otherSessions = await context.sessionFactory.create(2, {user});
        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
        const newPassword = faker.random.alphaNumeric(10);

        const response = await makeRequest({oldPassword: oldPassword, newPassword: newPassword}, session.token);
        await context.em.refresh(user);
        expect(response.statusCode).to.equal(204);
        expect(await passwordHasher.validate(newPassword, user.password)).toBeTruthy();
        expect(await context.em.find(Session, {id: {$in: otherSessions.map(s => s.id)}}, {refresh: true})).toHaveLength(0);
        expect(sendMailSpy).toHaveBeenCalledOnce();
        expect(sendMailSpy).toHaveBeenCalledWith(expect.objectContaining({to: user.email}));
    });
    test<LocalTestContext>("If old password does not match return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
        const newPassword = faker.random.alphaNumeric(10);

        const response = await makeRequest({oldPassword: faker.random.alphaNumeric(10), newPassword: newPassword}, session.token);
        await context.em.refresh(user);
        expect(response.statusCode).to.equal(401);
        expect(await passwordHasher.validate(newPassword, user.password)).toBeFalsy();
        expect(sendMailSpy).not.toHaveBeenCalled();
    });
    test<LocalTestContext>("If new password is invalid return 400", async (context) => {
        const oldPassword = faker.random.alphaNumeric(10);
        const user = await context.userFactory.createOne({password: await passwordHasher.hash(oldPassword)});
        const session = await context.sessionFactory.createOne({user});
        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
        const newPassword = faker.random.alphaNumeric(7);

        const response = await makeRequest({oldPassword: oldPassword, newPassword: newPassword}, session.token);
        await context.em.refresh(user);
        expect(response.statusCode).to.equal(400);
        expect(await passwordHasher.validate(newPassword, user.password)).toBeFalsy();
        expect(sendMailSpy).not.toHaveBeenCalled();
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const oldPassword = faker.random.alphaNumeric(10);
        const user = await context.userFactory.createOne({password: await passwordHasher.hash(oldPassword)});
        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
        const newPassword = faker.random.alphaNumeric(10);

        const response = await makeRequest({oldPassword: oldPassword, newPassword: newPassword});
        await context.em.refresh(user);
        expect(response.statusCode).to.equal(401);
        expect(await passwordHasher.validate(newPassword, user.password)).toBeFalsy();
        expect(sendMailSpy).not.toHaveBeenCalled();
    });
});

/**{@link UserController#updateUserProfile}*/
describe("PUT users/me/profile/", function () {
    const makeRequest = async ({data, files = {}}: {
        data?: object;
        files?: {
            [key: string]: {
                value: "";
            } | {
                value: Buffer;
                fileName?: string,
                mimeType?: string
            }
        };
    }, authToken?: string) => {
        return await fetchWithFiles({
            options: {
                method: "PUT",
                url: `users/me/profile/`,
                body: {
                    data: data,
                    files: files
                },
            },
            authToken: authToken
        });
    };

    describe("If user is logged in and all fields are valid update user profile, return 200", async (context) => {
        test<LocalTestContext>("If new profile picture is not provided, keep old profile picture", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const updatedProfile = context.profileFactory.makeOne();

            const response = await makeRequest({
                data: {
                    bio: updatedProfile.bio
                }
            }, session.token);
            await context.em.refresh(user.profile);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(profileSerializer.serialize(user.profile));
            const updatedFields: (keyof ProfileSchema)[] = ["bio"];
            expect(profileSerializer.serialize(user.profile, {include: updatedFields})).toEqual(profileSerializer.serialize(updatedProfile, {include: updatedFields}));
        });
        test<LocalTestContext>("If new profile picture is blank clear profile picture", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const updatedProfile = context.profileFactory.makeOne({profilePicture: ""});

            const response = await makeRequest({
                data: {
                    bio: updatedProfile.bio
                },
                files: {profilePicture: {value: ""}}
            }, session.token);
            await context.em.refresh(user.profile);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(profileSerializer.serialize(user.profile));
            const updatedFields: (keyof ProfileSchema)[] = ["profilePicture", "bio"];
            expect(profileSerializer.serialize(user.profile, {include: updatedFields})).toEqual(profileSerializer.serialize(updatedProfile, {include: updatedFields}));
        });
        test<LocalTestContext>("If new profile picture is provided, update profile picture", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const updatedProfile = context.profileFactory.makeOne({});

            const response = await makeRequest({
                data: {
                    bio: updatedProfile.bio
                },
                files: {profilePicture: readSampleFile("images/lorem-ipsum-69_8KB-1_1ratio.png")}
            }, session.token);
            await context.em.refresh(user.profile);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(profileSerializer.serialize(user.profile));
            expect(fs.existsSync(user.profile.profilePicture)).toBeTruthy();
            const updatedFields: (keyof ProfileSchema)[] = ["bio"];
            expect(profileSerializer.serialize(user.profile, {include: updatedFields})).toEqual(profileSerializer.serialize(updatedProfile, {include: updatedFields}));
        });
    });
    describe("If required fields are missing return 400", async (context) => {
        test<LocalTestContext>("If data is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const response = await makeRequest({}, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If bio is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const response = await makeRequest({
                data: {}
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid do not update profile, return 4XX", async (context) => {
        test<LocalTestContext>("If bio is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const response = await makeRequest({
                data: {bio: faker.random.alpha(300)}
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        describe("If profile picture is invalid return 4XX", async (context) => {
            test<LocalTestContext>("If profile picture is not a jpeg or png return 415", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const updatedProfile = context.profileFactory.makeOne({});

                const response = await makeRequest({
                    data: {
                        bio: updatedProfile.bio
                    },
                    files: {profilePicture: readSampleFile("images/audio-468_4KB.png")}
                }, session.token);

                expect(response.statusCode).to.equal(415);
            });
            test<LocalTestContext>("If the profile picture file is more than 500KB return 413", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const updatedProfile = context.profileFactory.makeOne({});

                vi.spyOn(fileValidatorExports, "validateFileFields").mockImplementation(mockValidateFileFields({"profilePicture": 510 * 1024}));
                const response = await makeRequest({
                    data: {
                        bio: updatedProfile.bio
                    },
                    files: {profilePicture: readSampleFile("images/lorem-ipsum-69_8KB-1_1ratio.png")}
                }, session.token);

                expect(response.statusCode).to.equal(413);
            });
            test<LocalTestContext>("If the profile picture is not square return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const updatedProfile = context.profileFactory.makeOne({});

                const response = await makeRequest({
                    data: {
                        bio: updatedProfile.bio
                    },
                    files: {profilePicture: readSampleFile("images/rectangle-5_2KB-2_1ratio.png")}
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const updatedProfile = context.profileFactory.makeOne();

        const response = await makeRequest({
            data: {bio: updatedProfile.bio}
        });

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const updatedProfile = context.profileFactory.makeOne();

        const response = await makeRequest({
            data: {bio: updatedProfile.bio}
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
});
