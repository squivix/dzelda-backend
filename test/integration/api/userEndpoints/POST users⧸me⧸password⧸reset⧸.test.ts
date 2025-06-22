import {describe, expect, test, TestContext, vi} from "vitest";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";
import crypto from "crypto";
import {PASSWORD_RESET_TOKEN_LENGTH} from "@/src/constants.js";
import {PasswordResetToken} from "@/src/models/entities/auth/PasswordResetToken.js";
import {expiringTokenHasher} from "@/src/utils/security/ExpiringTokenHasher.js";
import {faker} from "@faker-js/faker";
import {emailTransporter} from "@/src/nodemailer.config.js";
import {passwordHasher} from "@/src/utils/security/PasswordHasher.js";

/**{@link UserController#resetPassword}*/
describe("POST users/me/password/reset/", function () {
    const makeRequest = async (body: object) => {
        return await fetchRequest({
            method: "POST",
            url: `users/me/password/reset/`,
            payload: body
        });
    };
    test<TestContext>("If token is valid and not expired, and password is valid change password, send email, and return 204", async (context) => {
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
    test<TestContext>("If token does not exist, return 401", async (context) => {
        const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_LENGTH).toString("hex");

        const newPassword = faker.random.alphaNumeric(8);
        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");

        const response = await makeRequest({token: await expiringTokenHasher.hash(token), newPassword: newPassword});

        expect(response.statusCode).to.equal(401);
        expect(sendMailSpy).not.toHaveBeenCalled();
    });
    test<TestContext>("If token is expired, delete it and return 401", async (context) => {
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
    test<TestContext>("If password is invalid return 400", async (context) => {
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
