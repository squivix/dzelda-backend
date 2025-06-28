import {describe, expect, test, TestContext, vi} from "vitest";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {faker} from "@faker-js/faker";
import {passwordHasher} from "@/src/utils/security/PasswordHasher.js";
import {emailTransporter} from "@/src/nodemailer.config.js";
import {Session} from "@/src/models/entities/auth/Session.js";

/**{@link UserController#changeUserPassword}*/
describe("PUT users/me/password/", function () {
    const makeRequest = async (body: object, authToken?: string) => {
        return await fetchRequest({
            method: "PUT",
            url: `users/me/password/`,
            payload: body
        }, authToken);
    };

    test<TestContext>("If user is logged in, old password matches and new password is valid change password, delete all other sessions, send notification email, return 204", async (context) => {
        const oldPassword = faker.random.alphaNumeric(10);
        const user = await context.userFactory.createOne({password: await passwordHasher.hash(oldPassword)});
        const session = await context.sessionFactory.createOne({user});
        const otherSessions = await context.sessionFactory.create(2, {user});

        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
        const newPassword = faker.random.alphaNumeric(10);

        const response = await makeRequest({oldPassword: oldPassword, newPassword: newPassword}, session.token);
        await context.em.refresh(user);
        expect(response.statusCode).toEqual(204);
        expect(await passwordHasher.validate(newPassword, user.password)).toBeTruthy();
        expect(await context.em.find(Session, {id: {$in: otherSessions.map(s => s.id)}}, {refresh: true})).toHaveLength(0);
        expect(sendMailSpy).toHaveBeenCalledOnce();
        expect(sendMailSpy).toHaveBeenCalledWith(expect.objectContaining({to: user.email}));
    });
    test<TestContext>("If old password does not match return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
        const newPassword = faker.random.alphaNumeric(10);

        const response = await makeRequest({oldPassword: faker.random.alphaNumeric(10), newPassword: newPassword}, session.token);
        await context.em.refresh(user);
        expect(response.statusCode).toEqual(401);
        expect(await passwordHasher.validate(newPassword, user.password)).toBeFalsy();
        expect(sendMailSpy).not.toHaveBeenCalled();
    });
    test<TestContext>("If new password is invalid return 400", async (context) => {
        const oldPassword = faker.random.alphaNumeric(10);
        const user = await context.userFactory.createOne({password: await passwordHasher.hash(oldPassword)});
        const session = await context.sessionFactory.createOne({user});
        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
        const newPassword = faker.random.alphaNumeric(7);

        const response = await makeRequest({oldPassword: oldPassword, newPassword: newPassword}, session.token);
        await context.em.refresh(user);
        expect(response.statusCode).toEqual(400);
        expect(await passwordHasher.validate(newPassword, user.password)).toBeFalsy();
        expect(sendMailSpy).not.toHaveBeenCalled();
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const oldPassword = faker.random.alphaNumeric(10);
        const user = await context.userFactory.createOne({password: await passwordHasher.hash(oldPassword)});
        const sendMailSpy = vi.spyOn(emailTransporter, "sendMail");
        const newPassword = faker.random.alphaNumeric(10);

        const response = await makeRequest({oldPassword: oldPassword, newPassword: newPassword});
        await context.em.refresh(user);
        expect(response.statusCode).toEqual(401);
        expect(await passwordHasher.validate(newPassword, user.password)).toBeFalsy();
        expect(sendMailSpy).not.toHaveBeenCalled();
    });
});
