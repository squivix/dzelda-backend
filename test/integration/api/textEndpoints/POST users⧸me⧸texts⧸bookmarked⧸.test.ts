import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {TextBookmark} from "@/src/models/entities/TextBookmark.js";
import {faker} from "@faker-js/faker";
import {textLoggedInSerializer} from "@/src/presentation/response/serializers/Text/TextLoggedInSerializer.js";


/**{@link TextController#addTextToUserBookmarks}*/
describe("POST users/me/texts/bookmarked/", () => {
    const makeRequest = async (body: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `users/me/texts/bookmarked/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };

    test<TestContext>("If the text exists add text to user's bookmarked texts", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const expectedText = await context.textFactory.createOne({language, isPublic: true});
        await context.textRepo.annotateTextsWithUserData([expectedText], user);

        const response = await makeRequest({textId: expectedText.id}, session.token);

        expectedText.isBookmarked = true;
        expect(response.statusCode).toEqual(201);
        expect(response.json()).toEqual(textLoggedInSerializer.serialize(expectedText));
        const dbRecord = await context.em.findOne(TextBookmark, {bookmarker: user.profile, text: expectedText});
        expect(dbRecord).not.toBeNull();
        expect(textLoggedInSerializer.serialize(dbRecord!.text)).toEqual(textLoggedInSerializer.serialize(expectedText));
    });
    describe("If required fields are missing return 400", function () {
        test<TestContext>("If the textId is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const response = await makeRequest({}, session.token);
            expect(response.statusCode).toEqual(400);
        });
    });
    describe("If fields are invalid return 400", function () {
        describe("If the text is invalid return 400", async () => {
            test<TestContext>("If the textId is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest({textId: faker.random.alpha(10)}, session.token);
                expect(response.statusCode).toEqual(400);
            });
            test<TestContext>("If the text is not found return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest({textId: faker.datatype.number({min: 100000})}, session.token);
                expect(response.statusCode).toEqual(400);
            });
            test<TestContext>("If the text is not public and the user is logged in as author return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const author = await context.userFactory.createOne();
                const language = await context.languageFactory.createOne({learners: user.profile});
                const text = await context.textFactory.createOne({language, isPublic: false, addedBy: author.profile});

                const response = await makeRequest({textId: text.id}, session.token);

                expect(response.statusCode).toEqual(400);
            });
            test<TestContext>("If the text is not in a language the user is learning return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const text = await context.textFactory.createOne({language, isPublic: true});

                const response = await makeRequest({textId: text.id}, session.token);

                expect(response.statusCode).toEqual(400);
            });
        });
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne({learners: user.profile});
        const text = await context.textFactory.createOne({language, isPublic: true, addedBy: user.profile});

        const response = await makeRequest({textId: text.id});
        expect(response.statusCode).toEqual(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language, isPublic: true});

        const response = await makeRequest({textId: text.id}, session.token);
        expect(response.statusCode).toEqual(403);
    });
});