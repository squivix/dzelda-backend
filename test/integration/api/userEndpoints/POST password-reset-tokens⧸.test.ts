import {describe, expect, test, TestContext, vi} from "vitest";
import {fetchRequest, parseUrlQueryString} from "@/test/integration/utils.js";
import {BASE_URL, PASSWORD_RESET_TOKEN_LENGTH} from "@/src/constants.js";
import {emailTransporter} from "@/src/nodemailer.config.js";
import {PasswordResetToken} from "@/src/models/entities/auth/PasswordResetToken.js";
import {expiringTokenHasher} from "@/src/utils/security/ExpiringTokenHasher.js";
import crypto from "crypto";

/**{@link UserController#requestPasswordReset}*/
describe("POST password-reset-tokens/", function () {
    const makeRequest = async (body: object) => {
        return await fetchRequest({
            method: "POST",
            url: `password-reset-tokens/`,
            payload: body
        });
    };

    const resetUrlRegex = new RegExp(`${BASE_URL}/reset-password\\?token=.*`, "m");
    test<TestContext>("If username and email exist and match, create a token, store its hash in the db and send an email with the token, return 204", async (context) => {
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

        const resetUrlMatches = emailText.match(resetUrlRegex);
        expect(resetUrlMatches).not.toBeNull();
        const resetUrl = resetUrlMatches![0];
        expect(sendMailSpy.mock.calls[0][0].html).toMatch(resetUrl);
        const sentToken = parseUrlQueryString(resetUrl)["token"];
        expect(sentToken).toBeDefined();
        expect(await expiringTokenHasher.hash(sentToken)).toEqual(newlyCreatedToken!.token);
    });
    test<TestContext>("If token already exists delete it, create a new  token, store its hash in the db and send an email with the token, return 204", async (context) => {
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
        const resetUrlMatches = emailText.match(resetUrlRegex);
        expect(resetUrlMatches).not.toBeNull();
        const resetUrl = resetUrlMatches![0];
        expect(sendMailSpy.mock.calls[0][0].html).toMatch(resetUrl);
        const sentToken = parseUrlQueryString(resetUrl)["token"];
        expect(sentToken).toBeDefined();
        expect(await expiringTokenHasher.hash(sentToken)).toEqual(newlyCreatedToken!.token);
    });
    test<TestContext>("If username and email exist do not exist, do not send an email, return 204", async (context) => {
        const fakeUser = context.userFactory.makeOne();

        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
        const response = await makeRequest({
            username: fakeUser.username,
            email: fakeUser.email
        });

        expect(response.statusCode).to.equal(204);
        expect(sendMailSpy).not.toHaveBeenCalled();
    });
    test<TestContext>("If username and email, do not match, do not create a token or send an email, return 204", async (context) => {
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
