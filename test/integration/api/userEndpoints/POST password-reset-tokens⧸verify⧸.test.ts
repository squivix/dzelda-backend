import {describe, expect, test, TestContext} from "vitest";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";
import crypto from "crypto";
import {PASSWORD_RESET_TOKEN_LENGTH} from "@/src/constants.js";
import {PasswordResetToken} from "@/src/models/entities/auth/PasswordResetToken.js";
import {expiringTokenHasher} from "@/src/utils/security/ExpiringTokenHasher.js";

/**{@link UserController#verifyPasswordResetToken}*/
describe("POST password-reset-tokens/verify/", function () {
    const makeRequest = async (body: object) => {
        return await fetchRequest({
            method: "POST",
            url: `password-reset-tokens/verify/`,
            payload: body
        });
    };
    test<TestContext>("If token is valid return 204", async (context) => {
        const user = await context.userFactory.createOne();
        const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_LENGTH).toString("hex");
        context.em.create(PasswordResetToken, {
            user: user,
            token: await expiringTokenHasher.hash(token)
        });
        await context.em.flush();

        const response = await makeRequest({token: token});
        expect(response.statusCode).toEqual(204);

    });
    test<TestContext>("If token does not exist return 401", async (context) => {
        const response = await makeRequest({token: crypto.randomBytes(PASSWORD_RESET_TOKEN_LENGTH).toString("hex")});

        expect(response.statusCode).toEqual(401);
    });
    test<TestContext>("If token is expired, delete it and return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_LENGTH).toString("hex");
        const resetToken = context.em.create(PasswordResetToken, {
            user: user,
            token: await expiringTokenHasher.hash(token),
            expiresOn: new Date("2020-08-27T07:47:21.575Z")
        });
        await context.em.flush();

        const response = await makeRequest({token: token});

        expect(response.statusCode).toEqual(401);
        expect(await context.em.findOne(PasswordResetToken, {token: resetToken.token}, {refresh: true})).toBeNull();
    });

});
