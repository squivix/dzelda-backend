import {describe, expect, test, TestContext, vi} from "vitest";
import {fetchRequest, parseUrlQueryString} from "@/test/integration/integrationTestUtils.js";
import {DOMAIN_NAME, PASSWORD_RESET_TOKEN_LENGTH} from "@/src/constants.js";
import {emailTransporter} from "@/src/nodemailer.config.js";
import {EmailConfirmationToken} from "@/src/models/entities/auth/EmailConfirmationToken.js";
import {expiringTokenHasher} from "@/src/utils/security/ExpiringTokenHasher.js";
import crypto from "crypto";
import {faker} from "@faker-js/faker";

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
        test<TestContext>("If new email is not provided, use current unconfirmed user email", async (context) => {
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
        test<TestContext>("If new email is provided, use new email, update unconfirmed user email to new email", async (context) => {
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
    test<TestContext>("If token already exists delete it, create a new  token, store its hash in the db and send an email with the token, return 204", async (context) => {
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
    test<TestContext>("If email is already confirmed, do not create a token, do not send an email, return 400", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: true});
        const session = await context.sessionFactory.createOne({user});

        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
        const response = await makeRequest({}, session.token);

        expect(response.statusCode).to.equal(400);
        expect(await context.em.findOne(EmailConfirmationToken, {user})).toBeNull();
        expect(sendMailSpy).not.toHaveBeenCalled();
    });
    describe("If new email is invalid return 400", async (context) => {
        test<TestContext>("If email is not a valid email return 400", async (context) => {
            const user = await context.userFactory.createOne({isEmailConfirmed: false});
            const session = await context.sessionFactory.createOne({user});

            const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
            const response = await makeRequest({email: faker.random.alpha(8)}, session.token);

            expect(response.statusCode).to.equal(400);
            expect(await context.em.findOne(EmailConfirmationToken, {user})).toBeNull();
            expect(sendMailSpy).not.toHaveBeenCalled();
        });
        test<TestContext>("If email is longer than 255 characters return 400", async (context) => {
            const user = await context.userFactory.createOne({isEmailConfirmed: false});
            const session = await context.sessionFactory.createOne({user});

            const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
            const response = await makeRequest({email: faker.internet.email(faker.random.alpha(257))}, session.token);

            expect(response.statusCode).to.equal(400);
            expect(await context.em.findOne(EmailConfirmationToken, {user})).toBeNull();
            expect(sendMailSpy).not.toHaveBeenCalled();
        });
        test<TestContext>("If email is not unique return 400", async (context) => {
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

    test<TestContext>("If user is not logged in return 401", async (context) => {
        const response = await makeRequest({});

        expect(response.statusCode).to.equal(401);
    });

});
