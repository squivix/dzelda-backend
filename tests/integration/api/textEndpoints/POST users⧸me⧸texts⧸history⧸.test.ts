import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/tests/integration/utils.js";
import {textSerializer} from "@/src/presentation/response/serializers/entities/TextSerializer.js";
import {TextHistoryEntry} from "@/src/models/entities/TextHistoryEntry.js";
import {faker} from "@faker-js/faker";
import {textHistoryEntrySerializer} from "@/src/presentation/response/serializers/mappings/TextHistoryEntrySerializer.js";

/**{@link TextController#addTextToUserHistory}*/
describe("POST users/me/texts/history/", () => {
    const makeRequest = async (body: object, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `users/me/texts/history/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };
    test<TestContext>("If the text exists and is public and user is learning text language add text to user's text history", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const text = await context.textFactory.createOne({language, isPublic: true});
        await context.textRepo.annotateTextsWithUserData([text], user);
        const expectedTextHistoryEntry = context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text});

        const response = await makeRequest({textId: text.id}, session.token);

        await context.em.refresh(text, {populate: ["pastViewersCount"]});
        expect(response.statusCode).to.equal(201);
        expect(response.json()).toMatchObject(textHistoryEntrySerializer.serialize(expectedTextHistoryEntry, {ignore: ["timeViewed"]}));
        const dbRecord = await context.em.findOne(TextHistoryEntry, {
            pastViewer: user.profile, text: text
        }, {populate: ["text"]});
        expect(dbRecord).not.toBeNull();
        expect(textSerializer.serialize(dbRecord!.text)).toEqual(textSerializer.serialize(text));
    });
    test<TestContext>("If text is already in user history but is not latest add it again with newer timestamp", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const text1 = await context.textFactory.createOne({language, isPublic: true});
        const text2 = await context.textFactory.createOne({language, isPublic: true});
        const oldTextHistoryEntry = context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text1});
        context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text2});
        await context.em.flush();
        const expectedTextHistoryEntry = context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text1});
        await context.textRepo.annotateTextsWithUserData([text1], user);

        const response = await makeRequest({textId: text1.id}, session.token);
        await context.em.refresh(text1, {populate: ["pastViewersCount"]});

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toMatchObject(textHistoryEntrySerializer.serialize(expectedTextHistoryEntry, {ignore: ["timeViewed"]}));
        const dbRecords = await context.em.find(TextHistoryEntry, {
            pastViewer: user.profile, text: text1
        }, {populate: ["text"], orderBy: {timeViewed: "desc"}});
        expect(dbRecords).toHaveLength(2);
        expect(textSerializer.serialize(dbRecords[0].text)).toEqual(textSerializer.serialize(text1));
        expect(new Date(expectedTextHistoryEntry.timeViewed).getTime()).toBeGreaterThan(new Date(oldTextHistoryEntry.timeViewed).getTime());
    });
    test<TestContext>("If text is already in user history and is latest don't add it again, return 200", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const text = await context.textFactory.createOne({language, isPublic: true});
        const expectedTextHistoryEntry = context.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text});
        await context.em.flush()
        await context.textRepo.annotateTextsWithUserData([text], user);

        const response = await makeRequest({textId: text.id}, session.token);
        await context.em.refresh(text, {populate: ["pastViewersCount"]});

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toMatchObject(textHistoryEntrySerializer.serialize(expectedTextHistoryEntry, {ignore: ["timeViewed"]}));
        const dbRecords = await context.em.find(TextHistoryEntry, {
            pastViewer: user.profile, text: text
        }, {populate: ["text"], orderBy: {timeViewed: "desc"}});
        expect(dbRecords).toHaveLength(1);
        expect(textSerializer.serialize(dbRecords[0].text)).toEqual(textSerializer.serialize(text));
    });
    describe("If required fields are missing return 400", function () {
        test<TestContext>("If the textId is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const response = await makeRequest({}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 400", function () {
        describe("If the text is invalid return 400", async () => {
            test<TestContext>("If the textId is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest({textId: faker.random.alpha(10)}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If the text is not found return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest({textId: faker.datatype.number({min: 100000})}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If the text is not public and the user is logged in as author return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const author = await context.userFactory.createOne();
                const language = await context.languageFactory.createOne({learners: user.profile});
                const text = await context.textFactory.createOne({language, isPublic: false, addedBy: author.profile});

                const response = await makeRequest({textId: text.id}, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If the text is not in a language the user is learning return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const text = await context.textFactory.createOne({language, isPublic: true});

                const response = await makeRequest({textId: text.id}, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
    });
    test<TestContext>("If user is not logged in return 401", async () => {
        const response = await makeRequest({});
        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const text = await context.textFactory.createOne({language, isPublic: true});

        const response = await makeRequest({textId: text.id}, session.token);
        expect(response.statusCode).to.equal(403);
    });
});
