import {describe, expect, test, TestContext} from "vitest";
import {fetchRequest} from "@/tests/integration/utils.js";
import crypto from "crypto";
import {EMAIL_CONFIRM_TOKEN_LENGTH} from "@/src/constants.js";
import {EmailConfirmationToken} from "@/src/models/entities/auth/EmailConfirmationToken.js";
import {expiringTokenHasher} from "@/src/utils/security/ExpiringTokenHasher.js";

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
        test<TestContext>("If token is from first time sign up set isEmailConfirmed to true, delete token and return 204", async (context) => {
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
        test<TestContext>("If token is from email change, update user email to new confirmed email from token, delete token and return 204", async (context) => {
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
    test<TestContext>("If token does not exist, return 401", async (context) => {
        const token = crypto.randomBytes(EMAIL_CONFIRM_TOKEN_LENGTH).toString("hex");
        const response = await makeRequest({token: await expiringTokenHasher.hash(token)});

        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If token is expired, delete it and return 401", async (context) => {
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
