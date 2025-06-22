import {describe, expect, test, TestContext} from "vitest";
import {fetchRequest, omit} from "@/test/integration/integrationTestUtils.js";
import {defaultVocabsByLevel} from "dzelda-common";
import {faker} from "@faker-js/faker";
import {collectionSummaryLoggedInSerializer} from "@/src/presentation/response/serializers/Collection/CollectionSummaryLoggedInSerializer.js";

/**{@link CollectionController#createCollection}*/
describe("POST collections/", function () {
    const makeRequest = async (body: object, authToken?: string) => {
        return await fetchRequest({
            method: "POST",
            url: "collections/",
            body: body
        }, authToken);
    };

    describe("If all fields are valid a new collection should be created and return 201", () => {
        test<TestContext>("If optional fields are missing use default values", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();

            const newCollection = context.collectionFactory.makeOne({
                description: "",
                texts: [],
                addedBy: user.profile,
                language: language,
                image: "",
                isPublic: true,
                isBookmarked: false,
                vocabsByLevel: defaultVocabsByLevel(),
            });

            const response = await makeRequest({
                title: newCollection.title,
                languageCode: language.code,
            }, session.token);

            const responseBody = response.json();
            expect(response.statusCode).to.equal(201);
            expect(responseBody).toMatchObject(omit(collectionSummaryLoggedInSerializer.serialize(newCollection), ["id", "addedOn"]));

            const dbRecord = await context.collectionRepo.findOne({title: newCollection.title, language}, {populate: ["texts"]});
            expect(dbRecord).not.toBeNull();
            await context.collectionRepo.annotateCollectionsWithUserData([dbRecord!], user);
            expect(collectionSummaryLoggedInSerializer.serialize(dbRecord!)).toMatchObject(omit(collectionSummaryLoggedInSerializer.serialize(newCollection), ["id", "addedOn"]));
        });
        test<TestContext>("If optional fields are provided use provided values", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const fileUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "collectionImage"});

            const newCollection = context.collectionFactory.makeOne({
                addedBy: user.profile,
                language: language,
                texts: [],
                isPublic: false,
                isBookmarked: false,
                image: fileUploadRequest.fileUrl,
                vocabsByLevel: defaultVocabsByLevel()
            });
            const response = await makeRequest({
                title: newCollection.title,
                description: newCollection.description,
                languageCode: language.code,
                isPublic: newCollection.isPublic,
                image: fileUploadRequest.objectKey,
            }, session.token);

            const responseBody = response.json();
            expect(response.statusCode).to.equal(201);
            expect(responseBody).toEqual(expect.objectContaining(omit(collectionSummaryLoggedInSerializer.serialize(newCollection), ["id", "addedOn"])));

            const dbRecord = await context.collectionRepo.findOne({title: newCollection.title, language}, {populate: ["texts"]});
            expect(dbRecord).not.toBeNull();
            await context.collectionRepo.annotateCollectionsWithUserData([dbRecord!], user);
            expect(collectionSummaryLoggedInSerializer.serialize(dbRecord!)).toMatchObject(omit(collectionSummaryLoggedInSerializer.serialize(newCollection), ["id", "addedOn"]));
        });
    });
    test<TestContext>("If user not logged in return 401", async (context) => {
        const language = await context.languageFactory.createOne();
        const newCollection = context.collectionFactory.makeOne({language});

        const response = await makeRequest({
            title: newCollection.title,
            languageCode: language.code,
        });

        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const newCollection = context.collectionFactory.makeOne({language});

        const response = await makeRequest({
            title: newCollection.title,
            languageCode: language.code,
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
    describe("If required fields are missing return 400", async () => {
        test<TestContext>("If title is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();

            const response = await makeRequest({
                languageCode: language.code
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<TestContext>("If language is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});

            const newCollection = context.collectionFactory.makeOne();
            const response = await makeRequest({
                title: newCollection.title
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 400", async () => {
        test<TestContext>("If title is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();

            const response = await makeRequest({
                title: faker.random.alpha(300),
                languageCode: language.code,
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        describe("If language is invalid return 400", () => {
            test<TestContext>("If languageCode is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newCollection = context.collectionFactory.makeOne({language: language});

                const response = await makeRequest({
                    title: newCollection.title,
                    languageCode: faker.random.alphaNumeric(10),
                }, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If language is not found return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newCollection = context.collectionFactory.makeOne({language: language});

                const response = await makeRequest({
                    title: newCollection.title,
                    languageCode: faker.random.alpha(4),
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
        test<TestContext>("If description is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newCollection = context.collectionFactory.makeOne({language: language});

            const response = await makeRequest({
                title: newCollection.title,
                languageCode: language.code,
                description: faker.random.alpha(600)
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<TestContext>("If isPublic is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newCollection = context.collectionFactory.makeOne({language: language});

            const response = await makeRequest({
                title: newCollection.title,
                languageCode: language.code,
                isPublic: "maybe?"
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        describe("If image is invalid return 400", () => {
            test<TestContext>("If file upload request with key does not exist return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const fileUploadRequest = await context.fileUploadRequestFactory.makeOne({user: user, fileField: "collectionImage"});

                const newCollection = context.collectionFactory.makeOne({
                    addedBy: user.profile,
                    language: language,
                    texts: [],
                    image: fileUploadRequest.fileUrl,
                    vocabsByLevel: defaultVocabsByLevel()
                });
                const response = await makeRequest({
                    title: newCollection.title,
                    description: newCollection.description,
                    languageCode: language.code,
                    image: fileUploadRequest.objectKey,
                }, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If file upload request with key was not requested by user return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const fileUploadRequest = await context.fileUploadRequestFactory.createOne({user: otherUser, fileField: "collectionImage"});

                const newCollection = context.collectionFactory.makeOne({
                    addedBy: user.profile,
                    language: language,
                    texts: [],
                    image: fileUploadRequest.fileUrl,
                    vocabsByLevel: defaultVocabsByLevel()
                });
                const response = await makeRequest({
                    title: newCollection.title,
                    description: newCollection.description,
                    languageCode: language.code,
                    image: fileUploadRequest.objectKey,
                }, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If file upload request with key is not for collectionImage field return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const fileUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "textImage"});

                const newCollection = context.collectionFactory.makeOne({
                    addedBy: user.profile,
                    language: language,
                    texts: [],
                    image: fileUploadRequest.fileUrl,
                    vocabsByLevel: defaultVocabsByLevel()
                });
                const response = await makeRequest({
                    title: newCollection.title,
                    description: newCollection.description,
                    languageCode: language.code,
                    image: fileUploadRequest.objectKey,
                }, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
    });
});
