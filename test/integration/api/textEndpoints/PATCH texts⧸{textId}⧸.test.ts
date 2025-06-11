import {describe, expect, test, TestContext, vi} from "vitest";
import {fetchRequest} from "@/test/integration/utils.js";
import {textSerializer} from "@/src/presentation/response/serializers/entities/TextSerializer.js";
import {faker} from "@faker-js/faker";
import {TextService} from "@/src/services/TextService.js";

/**{@link TextController#updateText}*/
describe("PATCH texts/{textId}/", () => {
    const makeRequest = async (textId: number | string, body: object, authToken?: string) => {
        return await fetchRequest({
            method: "PATCH",
            url: `texts/${textId}/`,
            body: body,
        }, authToken);
    };

    describe("If the text exists, user is logged in as author and all fields are valid, update text and return 200", async () => {
        test<TestContext>("If optional field are not provided, keep old values", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();

            const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language});
            const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
            const updatedText = context.textFactory.makeOne({
                collection, language, level: text.level, addedBy: author.profile,
                isProcessing: true,
                parsedContent: null,
                parsedTitle: null,
            });
            const sendTextToParsingQueueSpy = vi.spyOn(TextService, "sendTextToParsingQueue").mockResolvedValue(undefined);

            const response = await makeRequest(text.id, {
                title: updatedText.title,
                content: updatedText.content
            }, session.token);

            const dbRecord = await context.textRepo.findOneOrFail({id: text.id}, {populate: ["language", "addedBy.user", "collection.language", "collection.addedBy.user"], refresh:true});
            await context.textRepo.annotateTextsWithUserData([dbRecord], author);
            await context.collectionRepo.annotateCollectionsWithUserData([dbRecord.collection!], author);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toMatchObject(textSerializer.serialize(updatedText, {ignore: []}));
            expect(textSerializer.serialize(dbRecord)).toMatchObject(textSerializer.serialize(updatedText, {ignore: []}));
            expect(sendTextToParsingQueueSpy).toHaveBeenCalledOnce();
            expect(sendTextToParsingQueueSpy).toHaveBeenCalledWith({
                textId: dbRecord.id,
                parsingPriority: 2
            });
        });
        describe("If optional fields are provided, update their values", async () => {
            test<TestContext>("If new image and audio are provided, update them", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();

                const collection = await context.collectionFactory.createOne({
                    addedBy: author.profile,
                    language,
                    texts: []
                });
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({
                    user: author,
                    fileField: "textImage"
                });
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({
                    user: author,
                    fileField: "textAudio"
                });
                const updatedText = context.textFactory.makeOne({
                    collection,
                    language,
                    isProcessing: true,
                    parsedContent: null,
                    parsedTitle: null,
                    image: imageUploadRequest.fileUrl,
                    audio: audioUploadRequest.fileUrl,
                    isPublic: !text.isPublic,
                    addedBy: author.profile
                });
                const sendTextToParsingQueueSpy = vi.spyOn(TextService, "sendTextToParsingQueue").mockResolvedValue(undefined);

                const response = await makeRequest(text.id, {
                    title: updatedText.title,
                    content: updatedText.content,
                    isPublic: updatedText.isPublic,
                    level: updatedText.level,
                    image: imageUploadRequest.objectKey,
                    audio: audioUploadRequest.objectKey,
                }, session.token);

                const dbRecord = await context.textRepo.findOneOrFail({id: text.id}, {populate: ["language", "addedBy.user", "collection.language", "collection.addedBy.user"], refresh:true});
                await context.em.populate(dbRecord, ["collection"]);
                await context.textRepo.annotateTextsWithUserData([dbRecord], author);
                await context.collectionRepo.annotateCollectionsWithUserData([updatedText.collection!], author);
                await context.collectionRepo.annotateCollectionsWithUserData([dbRecord.collection!], author);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toMatchObject(textSerializer.serialize(updatedText, {ignore: ["addedOn"]}));
                expect(textSerializer.serialize(dbRecord)).toMatchObject(textSerializer.serialize(updatedText, {ignore: ["addedOn"]}));
                expect(sendTextToParsingQueueSpy).toHaveBeenCalledOnce();
                expect(sendTextToParsingQueueSpy).toHaveBeenCalledWith({
                    textId: dbRecord.id,
                    parsingPriority: 2
                });
            });
            test<TestContext>("If new image and audio are blank clear text image and audio", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();

                const collection = await context.collectionFactory.createOne({
                    addedBy: author.profile,
                    language: language,
                    texts: []
                });
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const updatedText = context.textFactory.makeOne({
                    collection,
                    language,
                    image: "",
                    audio: "",
                    isProcessing: true,
                    parsedContent: null,
                    parsedTitle: null,
                    isPublic: !text.isPublic,
                    addedBy: author.profile
                });
                const sendTextToParsingQueueSpy = vi.spyOn(TextService, "sendTextToParsingQueue").mockResolvedValue(undefined);

                const response = await makeRequest(text.id, {
                    title: updatedText.title,
                    content: updatedText.content,
                    isPublic: updatedText.isPublic,
                    level: updatedText.level,
                    image: "",
                    audio: ""
                }, session.token);

                const dbRecord = await context.textRepo.findOneOrFail({id: text.id}, {populate: ["language", "addedBy.user", "collection", "collection.language", "collection.addedBy.user"], refresh:true});
                await context.em.populate(dbRecord, ["collection"]);
                await context.textRepo.annotateTextsWithUserData([dbRecord], author);
                await context.collectionRepo.annotateCollectionsWithUserData([dbRecord.collection!], author);
                await context.collectionRepo.annotateCollectionsWithUserData([updatedText.collection!], author);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toMatchObject(textSerializer.serialize(updatedText, {ignore: ["addedOn"]}));
                expect(textSerializer.serialize(dbRecord)).toMatchObject(textSerializer.serialize(updatedText, {ignore: ["addedOn"]}));
                expect(sendTextToParsingQueueSpy).toHaveBeenCalledOnce();
                expect(sendTextToParsingQueueSpy).toHaveBeenCalledWith({
                    textId: dbRecord.id,
                    parsingPriority: 2
                });
            });
            test<TestContext>("If collectionId is provided change collection", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();

                const collection = await context.collectionFactory.createOne({
                    addedBy: author.profile,
                    language: language,
                    texts: []
                });
                const newCollection = await context.collectionFactory.createOne({
                    addedBy: author.profile,
                    language: language
                });
                const text = await context.textFactory.createOne({
                    collection: collection,
                    language,
                    addedBy: author.profile
                });
                const updatedText = context.textFactory.makeOne({
                    isProcessing: true,
                    parsedContent: null,
                    parsedTitle: null,
                    collection: newCollection,
                    language,
                    isPublic: !text.isPublic,
                    addedBy: author.profile
                });
                const sendTextToParsingQueueSpy = vi.spyOn(TextService, "sendTextToParsingQueue").mockResolvedValue(undefined);

                const response = await makeRequest(text.id, {
                    collectionId: newCollection.id,
                    title: updatedText.title,
                    content: updatedText.content,
                    isPublic: updatedText.isPublic,
                    level: updatedText.level,
                }, session.token);

                const dbRecord = await context.textRepo.findOneOrFail({id: text.id}, {populate: ["language", "addedBy.user", "collection", "collection.language", "collection.addedBy.user"], refresh:true});
                await context.em.populate(dbRecord, ["collection"]);
                await context.textRepo.annotateTextsWithUserData([dbRecord], author);
                await context.collectionRepo.annotateCollectionsWithUserData([updatedText.collection!], author);
                await context.collectionRepo.annotateCollectionsWithUserData([dbRecord.collection!], author);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toMatchObject(textSerializer.serialize(updatedText, {ignore: ["addedOn"]}));
                expect(textSerializer.serialize(dbRecord)).toMatchObject(textSerializer.serialize(updatedText, {ignore: ["addedOn"]}));
                expect(dbRecord.orderInCollection).toEqual(await newCollection.texts.loadCount() - 1);
                expect(sendTextToParsingQueueSpy).toHaveBeenCalledOnce();
                expect(sendTextToParsingQueueSpy).toHaveBeenCalledWith({
                    textId: dbRecord.id,
                    parsingPriority: 2
                });
            });
            test<TestContext>("If collectionId is null remove from collection", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();

                const collection = await context.collectionFactory.createOne({
                    addedBy: author.profile,
                    language: language,
                    texts: []
                });
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const updatedText = context.textFactory.makeOne({
                    collection: null,
                    language,
                    isPublic: !text.isPublic,
                    addedBy: author.profile,
                    isProcessing: true,
                    parsedContent: null,
                    parsedTitle: null,
                });
                const sendTextToParsingQueueSpy = vi.spyOn(TextService, "sendTextToParsingQueue").mockResolvedValue(undefined);

                const response = await makeRequest(text.id, {
                    collectionId: null,
                    title: updatedText.title,
                    content: updatedText.content,
                    isPublic: updatedText.isPublic,
                    level: updatedText.level,
                }, session.token);

                const dbRecord = await context.textRepo.findOneOrFail({id: text.id}, {
                    populate: ["language", "addedBy.user", "collection", "collection.language", "collection.addedBy.user"],
                    refresh: true
                });
                await context.em.populate(dbRecord, ["collection"]);
                await context.textRepo.annotateTextsWithUserData([dbRecord], author);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toMatchObject(textSerializer.serialize(updatedText, {ignore: ["addedOn"]}));
                expect(textSerializer.serialize(dbRecord)).toMatchObject(textSerializer.serialize(updatedText, {ignore: ["addedOn"]}));
                expect(dbRecord.orderInCollection).toEqual(null);
                expect(sendTextToParsingQueueSpy).toHaveBeenCalledOnce();
                expect(sendTextToParsingQueueSpy).toHaveBeenCalledWith({
                    textId: dbRecord.id,
                    parsingPriority: 2
                });
            });
        });
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({
            addedBy: author.profile,
            language: language,
            texts: []
        });
        const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
        const updatedText = context.textFactory.makeOne({collection});

        const response = await makeRequest(text.id, {
            title: updatedText.title,
            content: updatedText.content,
        });

        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({
            addedBy: author.profile,
            language: language,
            texts: []
        });
        const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
        const updatedText = context.textFactory.makeOne({collection});

        const response = await makeRequest(text.id, {
            title: updatedText.title,
            content: updatedText.content,
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
    test<TestContext>("If text does not exist return 404", async (context) => {
        const author = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: author});
        const updatedText = await context.textFactory.makeOne();

        const response = await makeRequest(faker.random.numeric(20), {
            title: updatedText.title,
            content: updatedText.content,
        }, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If text is not public and user is not author return 404", async (context) => {
        const author = await context.userFactory.createOne();
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: otherUser});
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({
            addedBy: author.profile,
            language: language,
            texts: []
        });
        const text = await context.textFactory.createOne({
            collection,
            language,
            addedBy: author.profile,
            isPublic: false,
        });
        const updatedText = context.textFactory.makeOne();

        const response = await makeRequest(text.id, {
            title: updatedText.title,
            content: updatedText.content,
        }, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If text is public and user is not author of text collection return 403", async (context) => {
        const author = await context.userFactory.createOne();
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: otherUser});
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({
            addedBy: author.profile,
            language: language,
            texts: []
        });
        const text = await context.textFactory.createOne({
            collection,
            language,
            addedBy: author.profile,
            isPublic: true
        });
        const updatedText = context.textFactory.makeOne();

        const response = await makeRequest(text.id, {
            title: updatedText.title,
            content: updatedText.content,
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
    describe("If required fields are missing return 400", async () => {
        test<TestContext>("If title is missing return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({
                addedBy: author.profile,
                language,
                texts: []
            });
            const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});

            const updatedText = context.textFactory.makeOne();

            const response = await makeRequest(text.id, {
                content: updatedText.content,
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        test<TestContext>("If text is missing return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({
                addedBy: author.profile,
                language,
                texts: []
            });
            const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});

            const updatedText = context.textFactory.makeOne();

            const response = await makeRequest(text.id, {
                title: updatedText.title,
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 400", async () => {
        test<TestContext>("If title is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({
                addedBy: author.profile,
                language,
                texts: []
            });
            const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
            const updatedText = context.textFactory.makeOne({collection});

            const response = await makeRequest(text.id, {
                title: faker.random.alpha({count: 150}),
                content: updatedText.content,
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        test<TestContext>("If text is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({
                addedBy: author.profile,
                language,
                texts: []
            });
            const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
            const updatedText = context.textFactory.makeOne({collection});

            const response = await makeRequest(text.id, {
                title: updatedText.title,
                content: faker.random.alpha({count: 60_000}),
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        test<TestContext>("If isPublic is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({
                addedBy: author.profile,
                language,
                texts: []
            });
            const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
            const updatedText = context.textFactory.makeOne({collection});

            const response = await makeRequest(text.id, {
                title: updatedText.title,
                content: updatedText.content,
                isPublic: "kinda?"
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        test<TestContext>("If level is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({
                addedBy: author.profile,
                language,
                texts: []
            });
            const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
            const updatedText = context.textFactory.makeOne({collection});

            const response = await makeRequest(text.id, {
                title: updatedText.title,
                content: updatedText.content,
                level: "hard",
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });
        describe("If collection is invalid return 400", async () => {
            test<TestContext>("If collection id is not a number return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({
                    addedBy: author.profile,
                    language,
                    texts: []
                });
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const updatedText = context.textFactory.makeOne();

                const response = await makeRequest(text.id, {
                    collectionId: faker.random.alpha(3),
                    title: updatedText.title,
                    content: updatedText.content,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If collection does not exist return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({
                    addedBy: author.profile,
                    language,
                    texts: []
                });
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const updatedText = context.textFactory.makeOne();

                const response = await makeRequest(text.id, {
                    collectionId: faker.datatype.number({min: 10000}),
                    title: updatedText.title,
                    content: updatedText.content,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If user is not author of collection return 403", async (context) => {
                const user = await context.userFactory.createOne();
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({
                    addedBy: author.profile,
                    language,
                    texts: []
                });
                const newCollection = await context.collectionFactory.createOne({
                    addedBy: author.profile,
                    language,
                    texts: []
                });
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const updatedText = context.textFactory.makeOne();

                const response = await makeRequest(text.id, {
                    collectionId: newCollection.id,
                    title: updatedText.title,
                    content: updatedText.content,
                }, session.token);
                expect(response.statusCode).to.equal(403);
            });
            test<TestContext>("If collection is not in the same language as text return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language1 = await context.languageFactory.createOne();
                const language2 = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({
                    addedBy: author.profile,
                    language: language1,
                    texts: []
                });
                const newCollection = await context.collectionFactory.createOne({
                    addedBy: author.profile,
                    language: language2,
                    texts: []
                });
                const text = await context.textFactory.createOne({
                    collection,
                    language: language1,
                    addedBy: author.profile
                });
                const updatedText = context.textFactory.makeOne();

                const response = await makeRequest(text.id, {
                    collectionId: newCollection.id,
                    title: updatedText.title,
                    content: updatedText.content,
                }, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("If image is invalid return 400", async () => {
            test<TestContext>("If file upload request with key does not exist return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({
                    addedBy: author.profile,
                    language,
                    texts: []
                });
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const imageUploadRequest = await context.fileUploadRequestFactory.makeOne({
                    user: author,
                    fileField: "textImage"
                });
                const updatedText = context.textFactory.makeOne({collection, image: imageUploadRequest.fileUrl});

                const response = await makeRequest(text.id, {
                    title: updatedText.title,
                    content: updatedText.content,
                    image: imageUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If file upload request with key was not requested by user return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({
                    addedBy: author.profile,
                    language,
                    texts: []
                });
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({
                    user: otherUser,
                    fileField: "textImage"
                });
                const updatedText = context.textFactory.makeOne({collection, image: imageUploadRequest.fileUrl});

                const response = await makeRequest(text.id, {
                    title: updatedText.title,
                    content: updatedText.content,
                    image: imageUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If file upload request with key is not for textImage field return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({
                    addedBy: author.profile,
                    language,
                    texts: []
                });
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({
                    user: otherUser,
                    fileField: "collectionImage"
                });
                const updatedText = context.textFactory.makeOne({collection, image: imageUploadRequest.fileUrl});

                const response = await makeRequest(text.id, {
                    title: updatedText.title,
                    content: updatedText.content,
                    image: imageUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
        describe("If audio is invalid return 400", async () => {
            test<TestContext>("If file upload request with key does not exist return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({
                    addedBy: author.profile,
                    language,
                    texts: []
                });
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const audioUploadRequest = await context.fileUploadRequestFactory.makeOne({
                    user: author,
                    fileField: "textAudio"
                });
                const updatedText = context.textFactory.makeOne({collection, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest(text.id, {
                    title: updatedText.title,
                    content: updatedText.content,
                    audio: audioUploadRequest.objectKey
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If file upload request with key was not requested by user return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({
                    addedBy: author.profile,
                    language,
                    texts: []
                });
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({
                    user: otherUser,
                    fileField: "textAudio"
                });
                const updatedText = context.textFactory.makeOne({collection, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest(text.id, {
                    title: updatedText.title,
                    content: updatedText.content,
                    audio: audioUploadRequest.objectKey
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If file upload request with key is not for textAudio field return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({
                    addedBy: author.profile,
                    language,
                    texts: []
                });
                const text = await context.textFactory.createOne({collection, language, addedBy: author.profile});
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({
                    user: otherUser,
                    fileField: "collectionAudio"
                });
                const updatedText = context.textFactory.makeOne({collection, audio: audioUploadRequest.fileUrl});

                const response = await makeRequest(text.id, {
                    title: updatedText.title,
                    content: updatedText.content,
                    audio: audioUploadRequest.objectKey
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
    });
});
