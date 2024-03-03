import {describe, expect, test, TestContext, vi} from "vitest";
import {fetchRequest, parseUrlQueryString} from "@/tests/integration/utils.js";
import {BASE_URL, DOMAIN_NAME} from "@/src/constants.js";
import {emailTransporter} from "@/src/nodemailer.config.js";
import {EmailConfirmationToken} from "@/src/models/entities/auth/EmailConfirmationToken.js";
import {expiringTokenHasher} from "@/src/utils/security/ExpiringTokenHasher.js";
import {faker} from "@faker-js/faker";

/**{@link UserController#changeUserEmail}*/
describe("PUT users/me/email/", function () {
    const makeRequest = async (body: object, authToken?: string) => {
        return await fetchRequest({
            method: "PUT",
            url: `users/me/email/`,
            payload: body
        }, authToken);
    };

    const confirmUrlRegex = new RegExp(`${BASE_URL}/confirm-email\\?token=.*`, "m");
    test<TestContext>("If user is logged in and new email is valid generate confirmation token with new email and send confirmation to new email, return 204", async (context) => {
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
        const confirmUrlMatches = emailText.match(confirmUrlRegex);
        expect(confirmUrlMatches).not.toBeNull();
        const confirmUrl = confirmUrlMatches![0];

        expect(sendMailSpy.mock.calls[0][0].html).toMatch(confirmUrl);
        const sentToken = parseUrlQueryString(confirmUrl)["token"];
        expect(sentToken).toBeDefined();
        expect(await expiringTokenHasher.hash(sentToken)).toEqual(emailConfirmToken!.token);
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const newEmail = context.userFactory.makeOne().email;

        const response = await makeRequest({newEmail: newEmail});

        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const newEmail = context.userFactory.makeOne().email;

        const response = await makeRequest({newEmail: newEmail}, session.token);

        expect(response.statusCode).to.equal(403);
    });
    describe("If new email is invalid return 400", async (context) => {
        test<TestContext>("If email is not a valid email return 400", async (context) => {
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
        test<TestContext>("If email is longer than 255 characters return 400", async (context) => {
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
        test<TestContext>("If email is not unique return 400", async (context) => {
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
