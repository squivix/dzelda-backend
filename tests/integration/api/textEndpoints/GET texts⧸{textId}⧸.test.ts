import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/tests/integration/utils.js";
import {textSerializer} from "@/src/presentation/response/serializers/entities/TextSerializer.js";
import {faker} from "@faker-js/faker";

/**{@link TextController#getText}*/
describe("GET texts/{textId}/", () => {
    const makeRequest = async (textId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `texts/${textId}/`,
        };
        return await fetchRequest(options, authToken);
    };

    describe("If the text exists and is public return the text", () => {
        test<TestContext>("If the user is not logged in return text without vocab levels", async (context) => {
            const language = await context.languageFactory.createOne();
            const expectedText = await context.textFactory.createOne({language, isPublic: true});

            const response = await makeRequest(expectedText.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(textSerializer.serialize(expectedText));
        });
        test<TestContext>("If the user is logged in return text with vocab levels", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const expectedText = await context.textFactory.createOne({language, isPublic: true});
            await context.textRepo.annotateTextsWithUserData([expectedText], user);

            const response = await makeRequest(expectedText.id, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(textSerializer.serialize(expectedText));
        });
    });
    test<TestContext>("If the text does not exist return 404", async () => {
        const response = await makeRequest(Number(faker.random.numeric(8)));
        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If text id is invalid return 400", async () => {
        const response = await makeRequest(faker.random.alpha(8));
        expect(response.statusCode).to.equal(400);
    });
    describe("Hide private texts from non-authors", () => {
        test<TestContext>("If the text is private and the user is not logged in return 404", async (context) => {
            const language = await context.languageFactory.createOne();
            const text = await context.textFactory.createOne({language, isPublic: false});

            const response = await makeRequest(text.id);

            expect(response.statusCode).to.equal(404);
        });
        test<TestContext>("If the text is private and the user is logged in as a non-author return 404", async (context) => {
            const author = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const text = await context.textFactory.createOne({language, isPublic: false, addedBy: author.profile});
            const otherUser = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: otherUser});

            const response = await makeRequest(text.id, session.token);

            expect(response.statusCode).to.equal(404);
        });
        test<TestContext>("If the text is private and the user is logged in as author return text", async (context) => {
            const author = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const text = await context.textFactory.createOne({language, isPublic: false, addedBy: author.profile});
            const session = await context.sessionFactory.createOne({user: author});

            const response = await makeRequest(text.id, session.token);

            await context.textRepo.annotateTextsWithUserData([text], author);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(textSerializer.serialize(text));
        });

        test<TestContext>("If user is not logged in hide private text", async (context) => {

        });
        test<TestContext>("If user is not author hide private text", async (context) => {

        });
        test<TestContext>("If user is author show private text", async (context) => {

        });
    })
    describe("Hide texts in private collections from non-authors", () => {
        test<TestContext>("If the text is in private collection and the user is not logged in return 404", async (context) => {
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({language, isPublic: false});
            const text = await context.textFactory.createOne({language, collection});

            const response = await makeRequest(text.id);

            expect(response.statusCode).to.equal(404);
        });
        test<TestContext>("If the text is in private collection and the user is logged in as a non-author return 404", async (context) => {
            const author = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({language, isPublic: false});
            const text = await context.textFactory.createOne({language, collection, addedBy: author.profile});
            const otherUser = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: otherUser});

            const response = await makeRequest(text.id, session.token);

            expect(response.statusCode).to.equal(404);
        });
        test<TestContext>("If the text is in private collection and the user is logged in as author return text", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({language, isPublic: false, addedBy: author.profile});
            const text = await context.textFactory.createOne({language, collection});

            const response = await makeRequest(text.id, session.token);

            await context.textRepo.annotateTextsWithUserData([text], author);
            await context.collectionRepo.annotateCollectionsWithUserData([collection], author);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(textSerializer.serialize(text));
        });
    })

});
