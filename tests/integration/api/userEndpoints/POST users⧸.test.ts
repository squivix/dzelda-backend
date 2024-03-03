import {describe, expect, test, TestContext, vi} from "vitest";
import {fetchRequest, parseUrlQueryString} from "@/tests/integration/utils.js";
import {DOMAIN_NAME} from "@/src/constants.js";
import {emailTransporter} from "@/src/nodemailer.config.js";
import {userSerializer} from "@/src/presentation/response/serializers/entities/UserSerializer.js";
import {User} from "@/src/models/entities/auth/User.js";
import {EmailConfirmationToken} from "@/src/models/entities/auth/EmailConfirmationToken.js";
import {expiringTokenHasher} from "@/src/utils/security/ExpiringTokenHasher.js";
import {faker} from "@faker-js/faker";
import {BANNED_LITERAL_USERNAMES} from "@/src/validators/userValidator.js";

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
    test<TestContext>("If all fields are valid a new user should be registered with profile, and a confirmation link should be sent to their email and return 201", async (context) => {
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
        test<TestContext>("If username is missing return 400", async (context) => {
            const newUser = context.userFactory.makeOne();
            const response = await makeRequest({
                password: newUser.password,
                email: newUser.email
            });

            expect(response.statusCode).to.equal(400);
        });
        test<TestContext>("If email is missing return 400", async (context) => {
            const newUser = context.userFactory.makeOne();
            const response = await makeRequest({
                username: newUser.username,
                password: newUser.password,
            });

            expect(response.statusCode).to.equal(400);
        });
        test<TestContext>("If password is missing return 400", async (context) => {
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
            test<TestContext>("If username is shorter than 4 characters return 400", async (context) => {
                const newUser = context.userFactory.makeOne();
                const response = await makeRequest({
                    username: faker.random.alphaNumeric(3),
                    password: newUser.password,
                    email: newUser.email
                });

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If username is longer than 20 characters return 400", async (context) => {
                const newUser = context.userFactory.makeOne();
                const response = await makeRequest({
                    username: faker.random.alphaNumeric(21),
                    password: newUser.password,
                    email: newUser.email
                });

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If username contains any characters other than A-Z,a-z,_,0-9  return 400", async (context) => {
                const newUser = context.userFactory.makeOne();
                const response = await makeRequest({
                    username: faker.datatype.string(20),
                    password: newUser.password,
                    email: newUser.email
                });

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If username already exists return 400", async (context) => {
                const otherUser = await context.userFactory.createOne();
                const newUser = context.userFactory.makeOne();
                const response = await makeRequest({
                    username: otherUser.username,
                    password: newUser.password,
                    email: newUser.email
                });

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If username is a banned literal username return 400", async (context) => {
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
            test<TestContext>("If email is not a valid email return 400", async (context) => {
                const newUser = context.userFactory.makeOne();
                const response = await makeRequest({
                    username: newUser.username,
                    password: newUser.password,
                    email: faker.random.alphaNumeric(20)
                });
                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If email is longer than 255 characters return 400", async (context) => {
                const newUser = context.userFactory.makeOne();
                const response = await makeRequest({
                    username: newUser.username,
                    password: newUser.password,
                    email: faker.internet.email(faker.random.alpha(257))
                });
                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If email is not unique return 400", async (context) => {
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
            test<TestContext>("If password is shorter than 8 characters return 400", async (context) => {
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
