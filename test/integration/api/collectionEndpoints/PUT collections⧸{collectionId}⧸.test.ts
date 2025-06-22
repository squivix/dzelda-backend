import {describe, expect, test, TestContext} from "vitest";
import {fetchRequest, onlyKeep} from "@/test/integration/integrationTestUtils.js";
import {shuffleArray} from "@/test/utils.js";
import {CollectionSchema, TextSchema} from "dzelda-common";
import {faker} from "@faker-js/faker";
import {collectionLoggedInSerializer} from "@/src/presentation/response/serializers/Collection/CollectionLoggedInSerializer.js";

/**{@link CollectionController#updateCollection}*/
describe("PUT collections/{collectionId}/", function () {
    const makeRequest = async (collectionId: number | string, body: object, authToken?: string) => {
        return await fetchRequest({
            method: "PUT",
            url: `collections/${collectionId}/`,
            body: body
        }, authToken);
    };

    describe("If the collection exists, user is logged in as author and all fields are valid, update collection and return 200", async () => {
        test<TestContext>("If new image is not provided, keep old image", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            let collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: []});

            let textCounter = 0;
            let collectionTexts = await context.textFactory.each(l => {
                l.orderInCollection = textCounter;
                textCounter++;
            }).create(10, {collection, language, addedBy: author.profile});
            const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language});
            const shuffledTextIds = shuffleArray(collectionTexts).map(l => l.id);

            const response = await makeRequest(collection.id, {
                title: updatedCollection.title,
                description: updatedCollection.description,
                textsOrder: shuffledTextIds
            }, session.token);
            context.em.clear();
            collection = await context.collectionRepo.findOneOrFail({id: collection.id}, {populate: ["language", "addedBy", "addedBy.user", "addedBy.languagesLearning"]});
            await context.em.populate(collection, ["texts"], {orderBy: {texts: {orderInCollection: "asc"}}});
            await context.collectionRepo.annotateCollectionsWithUserData([collection], author);
            await context.textRepo.annotateTextsWithUserData(collection.texts.getItems(), author);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(collectionLoggedInSerializer.serialize(collection));
            expect(response.json().texts.map((l: TextSchema) => l.id)).toEqual(shuffledTextIds);
            const updatedFields: (keyof CollectionSchema)[] = ["title", "description"];
            expect(onlyKeep(collectionLoggedInSerializer.serialize(collection), updatedFields)).toEqual(onlyKeep(collectionLoggedInSerializer.serialize(updatedCollection), updatedFields));
        });
        test<TestContext>("If new image is blank clear collection image", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            let collection = await context.collectionFactory.createOne({addedBy: author.profile, language, texts: []});

            let textCounter = 0;
            let collectionTexts = await context.textFactory.each(l => {
                l.orderInCollection = textCounter;
                textCounter++;
            }).create(10, {collection, language, addedBy: author.profile});
            const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language, image: ""});
            const shuffledTextIds = shuffleArray(collectionTexts).map(l => l.id);

            const response = await makeRequest(collection.id, {
                title: updatedCollection.title,
                description: updatedCollection.description,
                textsOrder: shuffledTextIds,
                image: ""
            }, session.token);

            context.em.clear();
            collection = await context.collectionRepo.findOneOrFail({id: collection.id}, {populate: ["language", "addedBy", "addedBy.user", "addedBy.languagesLearning"]});
            await context.em.populate(collection, ["texts"], {orderBy: {texts: {orderInCollection: "asc"}}});
            await context.collectionRepo.annotateCollectionsWithUserData([collection], author);
            await context.textRepo.annotateTextsWithUserData(collection.texts.getItems(), author);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(collectionLoggedInSerializer.serialize(collection));
            expect(collection.image).toEqual("");
            expect(response.json().texts.map((l: TextSchema) => l.id)).toEqual(shuffledTextIds);
            const updatedFields: (keyof CollectionSchema)[] = ["title", "description", "image"];
            expect(onlyKeep(collectionLoggedInSerializer.serialize(collection), updatedFields)).toEqual(onlyKeep(collectionLoggedInSerializer.serialize(updatedCollection), updatedFields));
        });
        test<TestContext>("If new image is provided, update collection image", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            let collection = await context.collectionFactory.createOne({addedBy: author.profile, language, texts: [], image: ""});
            const fileUploadRequest = await context.fileUploadRequestFactory.createOne({user: author, fileField: "collectionImage"});

            let textCounter = 0;
            let collectionTexts = await context.textFactory.each(l => {
                l.orderInCollection = textCounter;
                textCounter++;
            }).create(10, {collection, language, addedBy: author.profile});
            const updatedCollection = context.collectionFactory.makeOne({
                addedBy: author.profile,
                language: language,
                image: fileUploadRequest.fileUrl,
                isPublic: false,
            });
            const shuffledTextIds = shuffleArray(collectionTexts).map(l => l.id);

            const response = await makeRequest(collection.id, {
                title: updatedCollection.title,
                description: updatedCollection.description,
                isPublic: updatedCollection.isPublic,
                textsOrder: shuffledTextIds,
                image: fileUploadRequest.objectKey,
            }, session.token);

            context.em.clear();
            collection = await context.collectionRepo.findOneOrFail({id: collection.id}, {populate: ["language", "addedBy", "addedBy.user", "addedBy.languagesLearning"]});
            await context.em.populate(collection, ["texts"], {orderBy: {texts: {orderInCollection: "asc"}}});
            await context.collectionRepo.annotateCollectionsWithUserData([collection], author);
            await context.textRepo.annotateTextsWithUserData(collection.texts.getItems(), author);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(collectionLoggedInSerializer.serialize(collection));
            expect(response.json().texts.map((l: TextSchema) => l.id)).toEqual(shuffledTextIds);
            const updatedFields: (keyof CollectionSchema)[] = ["title", "description", "image", "isPublic"];
            expect(onlyKeep(collectionLoggedInSerializer.serialize(collection), updatedFields)).toEqual(onlyKeep(collectionLoggedInSerializer.serialize(updatedCollection), updatedFields));
        });
    });
    test<TestContext>("If user not logged in return 401", async (context) => {
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: [], image: ""});

        let textCounter = 0;
        const collectionTexts = await context.textFactory.each(l => {
            l.orderInCollection = textCounter;
            textCounter++;
        }).create(10, {collection, language, addedBy: author.profile});
        const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language});

        const response = await makeRequest(collection.id, {
            title: updatedCollection.title,
            description: updatedCollection.description,
            textsOrder: shuffleArray(collectionTexts).map(l => l.id)
        });

        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: [], image: ""});

        let textCounter = 0;
        let collectionTexts = await context.textFactory.each(l => {
            l.orderInCollection = textCounter;
            textCounter++;
        }).create(10, {collection, language, addedBy: author.profile});
        const updatedCollection = await context.collectionFactory.makeOne({addedBy: author.profile, language});

        const response = await makeRequest(collection.id, {
            title: updatedCollection.title,
            description: updatedCollection.description,
            textsOrder: shuffleArray(collectionTexts).map(l => l.id)
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
    test<TestContext>("If collection does not exist return 404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const updatedCollection = await context.collectionFactory.makeOne({language});

        const response = await makeRequest(faker.random.numeric(20), {
            title: updatedCollection.title,
            description: updatedCollection.description,
            textsOrder: [1, 2, 3]
        }, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>("If user is not author of collection return 403", async (context) => {
        const author = await context.userFactory.createOne();
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: otherUser});
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({
            language, addedBy: author.profile,
            texts: [],
            image: ""
        });

        let textCounter = 0;
        let collectionTexts = await context.textFactory.each(l => {
            l.orderInCollection = textCounter;
            textCounter++;
        }).create(10, {collection, language, addedBy: author.profile});
        const updatedCollection = await context.collectionFactory.makeOne({addedBy: author.profile, language});

        const response = await makeRequest(collection.id, {
            title: updatedCollection.title,
            description: updatedCollection.description,
            textsOrder: shuffleArray(collectionTexts).map(l => l.id)
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
    test<TestContext>("If collection is not public and user is not author return 404", async (context) => {
        const author = await context.userFactory.createOne();
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: otherUser});
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({
            language, addedBy: author.profile,
            isPublic: false,
            texts: [],
            image: ""
        });

        let textCounter = 0;
        let collectionTexts = await context.textFactory.each(l => {
            l.orderInCollection = textCounter;
            textCounter++;
        }).create(10, {collection, language, addedBy: author.profile});
        const updatedCollection = await context.collectionFactory.makeOne({addedBy: author.profile, language});

        const response = await makeRequest(collection.id, {
            title: updatedCollection.title,
            description: updatedCollection.description,
            textsOrder: shuffleArray(collectionTexts).map(l => l.id)
        }, session.token);

        expect(response.statusCode).to.equal(404);
    });
    describe("If required fields are missing return 400", async () => {
        test<TestContext>("If title is missing return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({addedBy: author.profile, language, texts: [], image: ""});

            let textCounter = 0;
            let collectionTexts = await context.textFactory.each(l => {
                l.orderInCollection = textCounter;
                textCounter++;
            }).create(10, {collection, language, addedBy: author.profile});
            const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language});

            const response = await makeRequest(collection.id, {
                description: updatedCollection.description,
                textsOrder: shuffleArray(collectionTexts).map(l => l.id)
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<TestContext>("If description is missing return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: [], image: ""});

            let textCounter = 0;
            let collectionTexts = await context.textFactory.each(l => {
                l.orderInCollection = textCounter;
                textCounter++;
            }).create(10, {collection, language, addedBy: author.profile});
            const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language});

            const response = await makeRequest(collection.id, {
                title: updatedCollection.title,
                textsOrder: shuffleArray(collectionTexts).map(l => l.id)
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<TestContext>("If textsOrder is missing return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: [], image: ""});

            let textCounter = 0;
            await context.textFactory.each(l => {
                l.orderInCollection = textCounter;
                textCounter++;
            }).create(10, {collection, language, addedBy: author.profile});
            const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language});

            const response = await makeRequest(collection.id, {
                title: updatedCollection.title,
                description: updatedCollection.description,
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 400", async () => {
        test<TestContext>("If title is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: [], image: ""});

            let textCounter = 0;
            let collectionTexts = await context.textFactory.each(l => {
                l.orderInCollection = textCounter;
                textCounter++;
            }).create(10, {collection, language, addedBy: author.profile});
            const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language});

            const response = await makeRequest(collection.id, {
                title: faker.random.alpha(300),
                description: updatedCollection.description,
                textsOrder: shuffleArray(collectionTexts).map(l => l.id)
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<TestContext>("If description is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: [], image: ""});

            let textCounter = 0;
            let collectionTexts = await context.textFactory.each(l => {
                l.orderInCollection = textCounter;
                textCounter++;
            }).create(10, {collection, language, addedBy: author.profile});
            const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language});

            const response = await makeRequest(collection.id, {
                title: updatedCollection.title,
                description: faker.random.alpha(600),
                textsOrder: shuffleArray(collectionTexts).map(l => l.id),
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        describe("If textsOrder is invalid return 400", async () => {
            test<TestContext>("If textsOrder is not an array of integers return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: [], image: ""});
                const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language});

                const response = await makeRequest(collection.id, {
                    title: updatedCollection.title,
                    description: updatedCollection.description,
                    textsOrder: [1, 2, 3.5, -1, "42"]
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            describe("If textsOrder is not a permutation of collection text ids return 400", () => {
                test<TestContext>("If textsOrder has any new text ids return 400", async (context) => {
                    const author = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: author});
                    const language = await context.languageFactory.createOne();
                    const collection = await context.collectionFactory.createOne({
                        addedBy: author.profile,
                        language: language,
                        texts: [],
                        image: ""
                    });
                    let textCounter = 0;
                    let collectionTexts = await context.textFactory.each(l => {
                        l.orderInCollection = textCounter;
                        textCounter++;
                    }).create(10, {collection, language, addedBy: author.profile});
                    const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language});
                    const otherText = await context.textFactory.createOne({collection: await context.collectionFactory.createOne({language: language}), language: language});

                    const response = await makeRequest(collection.id, {
                        title: updatedCollection.title,
                        description: updatedCollection.description,
                        textsOrder: [...shuffleArray(collectionTexts.map(l => l.id)), otherText.id]
                    }, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<TestContext>("If textsOrder is missing text ids return 400", async (context) => {
                    const author = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: author});
                    const language = await context.languageFactory.createOne();
                    const collection = await context.collectionFactory.createOne({
                        addedBy: author.profile,
                        language: language,
                        texts: [],
                        image: ""
                    });
                    let textCounter = 0;
                    let collectionTexts = await context.textFactory.each(l => {
                        l.orderInCollection = textCounter;
                        textCounter++;
                    }).create(10, {collection, language, addedBy: author.profile});
                    const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language,});
                    const textsOrder = shuffleArray(collectionTexts).map(l => l.id);
                    textsOrder.splice(faker.datatype.number({max: collectionTexts.length - 1}),
                        faker.datatype.number({min: 1, max: collectionTexts.length}));

                    const response = await makeRequest(collection.id, {
                        title: updatedCollection.title,
                        description: updatedCollection.description,
                        textsOrder: textsOrder
                    }, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<TestContext>("If textsOrder has any repeated ids return 400", async (context) => {
                    const author = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user: author});
                    const language = await context.languageFactory.createOne();
                    const collection = await context.collectionFactory.createOne({
                        addedBy: author.profile,
                        language: language,
                        texts: [],
                        image: ""
                    });
                    let textCounter = 0;
                    let collectionTexts = await context.textFactory.each(l => {
                        l.orderInCollection = textCounter;
                        textCounter++;
                    }).create(10, {collection, language, addedBy: author.profile});
                    const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language});
                    const textsOrder = shuffleArray(collectionTexts).map(l => l.id);
                    textsOrder.splice(faker.datatype.number({max: collectionTexts.length - 1}), 0, textsOrder[faker.datatype.number({max: collectionTexts.length - 1})]);

                    const response = await makeRequest(collection.id, {
                        title: updatedCollection.title,
                        description: updatedCollection.description,
                        textsOrder: textsOrder
                    }, session.token);

                    expect(response.statusCode).to.equal(400);
                });
            });
        });
        describe("If image is invalid return 400", () => {
            test<TestContext>("If file upload request with key does not exist return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: [], image: ""});
                const fileUploadRequest = await context.fileUploadRequestFactory.makeOne({user: author, fileField: "collectionImage"});

                let textCounter = 0;
                let collectionTexts = await context.textFactory.each(l => {
                    l.orderInCollection = textCounter;
                    textCounter++;
                }).create(10, {collection, language, addedBy: author.profile});
                const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language});

                const response = await makeRequest(collection.id, {
                    title: faker.random.alpha(300),
                    description: updatedCollection.description,
                    textsOrder: shuffleArray(collectionTexts).map(l => l.id),
                    image: fileUploadRequest.objectKey
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If file upload request with key was not requested by user return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: [], image: ""});
                const fileUploadRequest = await context.fileUploadRequestFactory.createOne({user: otherUser, fileField: "collectionImage"});

                let textCounter = 0;
                let collectionTexts = await context.textFactory.each(l => {
                    l.orderInCollection = textCounter;
                    textCounter++;
                }).create(10, {collection, language, addedBy: author.profile});
                const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language});

                const response = await makeRequest(collection.id, {
                    title: faker.random.alpha(300),
                    description: updatedCollection.description,
                    textsOrder: shuffleArray(collectionTexts).map(l => l.id),
                    image: fileUploadRequest.objectKey
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If file upload request with key is not for collectionImage field return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: [], image: ""});
                const fileUploadRequest = await context.fileUploadRequestFactory.createOne({user: author, fileField: "textImage"});

                let textCounter = 0;
                let collectionTexts = await context.textFactory.each(l => {
                    l.orderInCollection = textCounter;
                    textCounter++;
                }).create(10, {collection, language, addedBy: author.profile});
                const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language});

                const response = await makeRequest(collection.id, {
                    title: faker.random.alpha(300),
                    description: updatedCollection.description,
                    textsOrder: shuffleArray(collectionTexts).map(l => l.id),
                    image: fileUploadRequest.objectKey
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
    });
});
