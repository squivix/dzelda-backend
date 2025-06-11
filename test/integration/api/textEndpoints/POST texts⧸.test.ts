import {describe, expect, test, TestContext, vi} from "vitest";
import {fetchRequest} from "@/test/integration/utils.js";
import {LanguageLevel} from "dzelda-common";
import {textSerializer} from "@/src/presentation/response/serializers/entities/TextSerializer.js";
import {faker} from "@faker-js/faker";
import {TextService} from "@/src/services/TextService.js";


/**{@link TextController#createText}*/
describe("POST texts/", () => {
    const makeRequest = async (body: object, authToken?: string) => {
        return await fetchRequest({
            method: "POST",
            url: "texts/",
            body: body,
        }, authToken);
    };

    describe("If all fields are valid a new text should be created and return 201", () => {
        test<TestContext>("If optional fields are missing use default values", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newText = context.textFactory.makeOne({
                isProcessing: true,
                parsedContent: null,
                parsedTitle: null,
                level: LanguageLevel.ADVANCED_1,
                language,
                image: "",
                audio: "",
                addedBy: user.profile
            });
            const sendTextToParsingQueueSpy = vi.spyOn(TextService, "sendTextToParsingQueue").mockResolvedValue(undefined);

            const response = await makeRequest({
                languageCode: language.code,
                title: newText.title,
                content: newText.content,
            }, session.token);

            expect(response.statusCode).to.equal(201);
            const dbRecord = await context.textRepo.findOne({
                language,
                title: newText.title
            }, {populate: ["language", "addedBy.user", "collection.language", "collection.addedBy.user"]});
            expect(dbRecord).not.toBeNull();
            if (!dbRecord) return;
            await context.textRepo.annotateTextsWithUserData([dbRecord], user);
            expect(response.json()).toMatchObject(textSerializer.serialize(newText, {ignore: ["addedOn"]}));
            expect(textSerializer.serialize(dbRecord)).toMatchObject(textSerializer.serialize(newText, {ignore: ["addedOn"]}));
            expect(sendTextToParsingQueueSpy).toHaveBeenCalledOnce();
            expect(sendTextToParsingQueueSpy).toHaveBeenCalledWith({
                textId: dbRecord.id,
                parsingPriority: 2
            });

            //TODO move this parsing testing to the parseText background worker tests

            // const parser = parsers["en"];
            // const textWords = parser.splitWords(parser.parseText(`${newText.title} ${newText.content}`), {keepDuplicates: false});
            // const textVocabs = await context.vocabRepo.find({text: textWords, language: language});
            // const textVocabMappings = await context.em.find(MapTextVocab, {vocab: textVocabs, text: dbRecord});
            //
            // expect(textVocabs.length).toEqual(textWords.length);
            // expect(textVocabs.map(v => v.text)).toEqual(expect.arrayContaining(textWords));
            // expect(textVocabMappings.length).toEqual(textWords.length);
        });
        test<TestContext>("If optional fields are provided use provided values", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({
                language: language,
                addedBy: user.profile,
                texts: []
            });
            const imageUploadRequest = await context.fileUploadRequestFactory.createOne({
                user: user,
                fileField: "textImage"
            });
            const audioUploadRequest = await context.fileUploadRequestFactory.createOne({
                user: user,
                fileField: "textAudio"
            });
            const newText = context.textFactory.makeOne({
                isProcessing: true,
                parsedContent: null,
                parsedTitle: null,
                language: language,
                image: imageUploadRequest.fileUrl,
                audio: audioUploadRequest.fileUrl,
                addedBy: user.profile,
                collection: collection,
                isPublic: false,
                level: LanguageLevel.BEGINNER_2,
            });
            const sendTextToParsingQueueSpy = vi.spyOn(TextService, "sendTextToParsingQueue").mockResolvedValue(undefined);

            const response = await makeRequest({
                languageCode: language.code,
                title: newText.title,
                content: newText.content,
                collectionId: collection.id,
                isPublic: newText.isPublic,
                level: newText.level,
                image: imageUploadRequest.objectKey,
                audio: audioUploadRequest.objectKey,
            }, session.token);

            expect(response.statusCode).to.equal(201);
            const dbRecord = await context.textRepo.findOne({
                collection,
                title: newText.title
            }, {populate: ["language", "addedBy.user", "collection.language", "collection.addedBy.user"]});
            expect(dbRecord).not.toBeNull();
            if (!dbRecord) return;
            await context.textRepo.annotateTextsWithUserData([dbRecord], user);
            await context.collectionRepo.annotateCollectionsWithUserData([dbRecord.collection!], user);
            expect(response.json()).toMatchObject(textSerializer.serialize(newText, {ignore: ["addedOn"]}));
            expect(textSerializer.serialize(dbRecord)).toMatchObject(textSerializer.serialize(newText, {ignore: ["addedOn",]}));
            expect(sendTextToParsingQueueSpy).toHaveBeenCalledOnce();
            expect(sendTextToParsingQueueSpy).toHaveBeenCalledWith({
                textId: dbRecord.id,
                parsingPriority: 2
            });
        });
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const language = await context.languageFactory.createOne();
        const newText = context.textFactory.makeOne({language});

        const response = await makeRequest({
            languageCode: newText.language.code,
            title: newText.title,
            content: newText.content,
        });

        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const newText = context.textFactory.makeOne({language});

        const response = await makeRequest({
            languageCode: newText.language.code,
            title: newText.title,
            content: newText.content,
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
    describe("If required fields are missing return 400", async () => {
        test<TestContext>("If title is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newText = context.textFactory.makeOne({language});

            const response = await makeRequest({
                languageCode: newText.language.code,
                content: newText.content,
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<TestContext>("If text is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newText = context.textFactory.makeOne({language});

            const response = await makeRequest({
                languageCode: newText.language.code,
                title: newText.title,
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<TestContext>("If languageCode is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newText = context.textFactory.makeOne({language});

            const response = await makeRequest({
                title: newText.title,
                content: newText.content,
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 400", async () => {
        test<TestContext>("If title is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newText = context.textFactory.makeOne({language});

            const response = await makeRequest({
                languageCode: newText.language.code,
                title: faker.random.alphaNumeric(200),
                content: newText.content,
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<TestContext>("If text is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newText = context.textFactory.makeOne({language});

            const response = await makeRequest({
                languageCode: newText.language.code,
                title: newText.content,
                content: faker.random.words(40000),
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        describe("If collection is invalid return 400", async () => {
            test<TestContext>("If collection id is not a number return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newText = context.textFactory.makeOne({language});

                const response = await makeRequest({
                    languageCode: newText.language.code,
                    title: newText.title,
                    content: newText.content,
                    collectionId: faker.random.alpha(3),
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If collection does not exist return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newText = context.textFactory.makeOne({language});

                const response = await makeRequest({
                    languageCode: newText.language.code,
                    title: newText.title,
                    content: newText.content,
                    collectionId: faker.datatype.number({min: 10000}),
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If collection is in a different language than text return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language1 = await context.languageFactory.createOne();
                const language2 = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({language: language1});
                const newText = context.textFactory.makeOne({language: language2});

                const response = await makeRequest({
                    languageCode: newText.language.code,
                    title: newText.title,
                    content: newText.content,
                    collectionId: collection.id,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If user is not author of collection return 403", async (context) => {
                const user = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({
                    language,
                    addedBy: otherUser.profile,
                    texts: []
                });
                const newText = context.textFactory.makeOne({language, collection});

                const response = await makeRequest({
                    languageCode: newText.language.code,
                    title: newText.title,
                    content: newText.content,
                    collectionId: collection.id,
                }, session.token);

                expect(response.statusCode).to.equal(403);
            });

        });
        describe("If image is invalid return 400", async () => {
            test<TestContext>("If file upload request with key does not exist return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const imageUploadRequest = await context.fileUploadRequestFactory.makeOne({
                    user: user,
                    fileField: "textImage"
                });
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({
                    user: user,
                    fileField: "textAudio"
                });
                const newText = context.textFactory.makeOne({
                    language,
                    image: imageUploadRequest.fileUrl,
                    audio: audioUploadRequest.fileUrl
                });

                const response = await makeRequest({
                    languageCode: newText.language.code,
                    title: newText.title,
                    content: newText.content,
                    image: imageUploadRequest.objectKey,
                    audio: audioUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If file upload request with key was not requested by user return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({
                    user: otherUser,
                    fileField: "textImage"
                });
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({
                    user: user,
                    fileField: "textAudio"
                });
                const newText = context.textFactory.makeOne({
                    language,
                    image: imageUploadRequest.fileUrl,
                    audio: audioUploadRequest.fileUrl
                });

                const response = await makeRequest({
                    languageCode: newText.language.code,
                    title: newText.title,
                    content: newText.content,
                    image: imageUploadRequest.objectKey,
                    audio: audioUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If file upload request with key is not for textImage field return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({
                    user: user,
                    fileField: "collectionImage"
                });
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({
                    user: user,
                    fileField: "textAudio"
                });
                const newText = context.textFactory.makeOne({
                    language,
                    image: imageUploadRequest.fileUrl,
                    audio: audioUploadRequest.fileUrl
                });

                const response = await makeRequest({
                    languageCode: newText.language.code,
                    title: newText.title,
                    content: newText.content,
                    image: imageUploadRequest.objectKey,
                    audio: audioUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
        describe("If audio is invalid return 400", async () => {
            test<TestContext>("If file upload request with key does not exist return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({
                    user: user,
                    fileField: "textImage"
                });
                const audioUploadRequest = await context.fileUploadRequestFactory.makeOne({
                    user: user,
                    fileField: "textAudio"
                });
                const newText = context.textFactory.makeOne({
                    language,
                    image: imageUploadRequest.fileUrl,
                    audio: audioUploadRequest.fileUrl
                });

                const response = await makeRequest({
                    languageCode: newText.language.code,
                    title: newText.title,
                    content: newText.content,
                    image: imageUploadRequest.objectKey,
                    audio: audioUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If file upload request with key was not requested by user return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({
                    user: user,
                    fileField: "textImage"
                });
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({
                    user: otherUser,
                    fileField: "textAudio"
                });
                const newText = context.textFactory.makeOne({
                    language,
                    image: imageUploadRequest.fileUrl,
                    audio: audioUploadRequest.fileUrl
                });

                const response = await makeRequest({
                    languageCode: newText.language.code,
                    title: newText.title,
                    content: newText.content,
                    image: imageUploadRequest.objectKey,
                    audio: audioUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If file upload request with key is not for textAudio field return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const imageUploadRequest = await context.fileUploadRequestFactory.createOne({
                    user: user,
                    fileField: "textImage"
                });
                const audioUploadRequest = await context.fileUploadRequestFactory.createOne({
                    user: user,
                    fileField: "collectionAudio"
                });
                const newText = context.textFactory.makeOne({
                    language,
                    image: imageUploadRequest.fileUrl,
                    audio: audioUploadRequest.fileUrl
                });

                const response = await makeRequest({
                    languageCode: newText.language.code,
                    title: newText.title,
                    content: newText.content,
                    image: imageUploadRequest.objectKey,
                    audio: audioUploadRequest.objectKey,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
    });
});
