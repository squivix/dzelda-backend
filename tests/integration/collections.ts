import {beforeEach, describe, expect, test, TestContext} from "vitest";
import {orm} from "@/src/server.js";
import {buildQueryString, createComparator, fetchRequest} from "@/tests/integration/utils.js";
import {UserFactory} from "@/devtools/factories/UserFactory.js";
import {SessionFactory} from "@/devtools/factories/SessionFactory.js";
import {ProfileFactory} from "@/devtools/factories/ProfileFactory.js";
import {CollectionFactory} from "@/devtools/factories/CollectionFactory.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {CollectionRepo} from "@/src/models/repos/CollectionRepo.js";
import {InjectOptions} from "light-my-request";
import {LanguageFactory} from "@/devtools/factories/LanguageFactory.js";
import {faker} from "@faker-js/faker";
import {randomCase, shuffleArray} from "@/tests/utils.js";
import {defaultVocabsByLevel} from "@/src/models/enums/VocabLevel.js";
import {TextFactory} from "@/devtools/factories/TextFactory.js";
import {TextRepo} from "@/src/models/repos/TextRepo.js";
import {Text} from "@/src/models/entities/Text.js";
import {collectionSerializer} from "@/src/presentation/response/serializers/entities/CollectionSerializer.js";
import {CollectionSchema, TextSchema} from "dzelda-common";
import {CollectionBookmark} from "@/src/models/entities/CollectionBookmark.js";
import {FileUploadRequestFactory} from "@/devtools/factories/FileUploadRequestFactory.js";

interface LocalTestContext extends TestContext {
    collectionRepo: CollectionRepo;
    textRepo: TextRepo;
    languageFactory: LanguageFactory;
    collectionFactory: CollectionFactory;
    textFactory: TextFactory;
    fileUploadRequestFactory: FileUploadRequestFactory;
}

beforeEach<LocalTestContext>(async (context) => {
    await orm.getSchemaGenerator().clearDatabase();
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.profileFactory = new ProfileFactory(context.em);
    context.sessionFactory = new SessionFactory(context.em);
    context.collectionFactory = new CollectionFactory(context.em);
    context.textFactory = new TextFactory(context.em);
    context.fileUploadRequestFactory = new FileUploadRequestFactory(context.em);
    context.languageFactory = new LanguageFactory(context.em);
    context.textRepo = context.em.getRepository(Text) as TextRepo;
    context.collectionRepo = context.em.getRepository(Collection) as CollectionRepo;
});

/**{@link CollectionController#getCollections}*/
describe("GET collections/", function () {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `collections/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const queryDefaults = {pagination: {pageSize: 10, page: 1}};
    const defaultSortComparator = createComparator(Collection, [
        {property: "title", order: "asc"},
        {property: "id", order: "asc"}]
    );
    test<LocalTestContext>("If there are no filters return all collections", async (context) => {
        const language = await context.languageFactory.createOne();
        const expectedCollection = await context.collectionFactory.create(5, {language});
        expectedCollection.sort(defaultSortComparator);
        const recordsCount = expectedCollection.length;

        const response = await makeRequest();

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: collectionSerializer.serializeList(expectedCollection)
        });
    });
    describe("test languageCode filter", () => {
        test<LocalTestContext>("If language filter is valid and language exists only return public collections in that language", async (context) => {
            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            const expectedCollections = await context.collectionFactory.create(3, {language: language1});
            await context.collectionFactory.create(3, {language: language2});
            expectedCollections.sort(defaultSortComparator);
            const recordsCount = expectedCollections.length;

            const response = await makeRequest({languageCode: language1.code});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: collectionSerializer.serializeList(expectedCollections)
            });
        });
        test<LocalTestContext>("If language does not exist return empty list", async (context) => {
            await context.collectionFactory.create(3, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({languageCode: faker.random.alpha({count: 4})});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: 0,
                data: []
            });
        });
        test<LocalTestContext>("If language filter is invalid return 400", async (context) => {
            const response = await makeRequest({languageCode: 12345});
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test addedBy filter", () => {
        test<LocalTestContext>("If addedBy filter is valid and user exists only return public collections added by that user", async (context) => {
            const user1 = await context.userFactory.createOne();
            const language = await context.languageFactory.createOne();
            const expectedCollections = await context.collectionFactory.create(3, {language, addedBy: user1.profile});
            await context.collectionFactory.create(3, {language});
            expectedCollections.sort(defaultSortComparator);
            const recordsCount = expectedCollections.length;

            const response = await makeRequest({addedBy: user1.username});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: collectionSerializer.serializeList(expectedCollections)
            });
        });
        test<LocalTestContext>("If addedBy is me and signed in return collections added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const expectedCollections = await context.collectionFactory.create(6, {language, addedBy: user.profile});
            await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
            await context.collectionFactory.create(3, {language});

            expectedCollections.sort(defaultSortComparator);
            const recordsCount = expectedCollections.length;

            const response = await makeRequest({addedBy: "me"}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: collectionSerializer.serializeList(expectedCollections)
            });
        });
        test<LocalTestContext>("If addedBy is me and not signed in return 401", async (context) => {
            const response = await makeRequest({addedBy: "me"});
            expect(response.statusCode).to.equal(401);
        });
        test<LocalTestContext>("If user does not exist return empty list", async (context) => {
            await context.collectionFactory.create(3, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({addedBy: faker.random.alpha({count: 20})});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: 0,
                data: []
            });
        });
        test<LocalTestContext>("If addedBy filter is invalid return 400", async (context) => {
            const response = await makeRequest({addedBy: "!@#%#%^#^!"});
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test searchQuery filter", () => {
        test<LocalTestContext>("If searchQuery is valid return collections with query in title or description", async (context) => {
            const language = await context.languageFactory.createOne();
            const searchQuery = "search query";
            const expectedCollections = [
                await context.collectionFactory.createOne({language, title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`}),
                await context.collectionFactory.createOne({language, description: `description ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`})
            ];
            await context.collectionFactory.create(3, {language: language});
            expectedCollections.sort(defaultSortComparator);
            const recordsCount = expectedCollections.length;

            const response = await makeRequest({searchQuery: searchQuery});
            expect(response.statusCode).to.equal(200);

            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: collectionSerializer.serializeList(expectedCollections)
            });
        });
        test<LocalTestContext>("If searchQuery is invalid return 400", async (context) => {
            const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})});

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If no collections match search query return empty list", async (context) => {
            await context.collectionFactory.create(3, {language: await context.languageFactory.createOne()});

            const response = await makeRequest({searchQuery: faker.random.alpha({count: 200})});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: 0,
                data: []
            });
        });
    });
    describe("test sort", () => {
        describe("test sortBy", () => {
            test<LocalTestContext>("test sortBy title", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedCollections = [
                    await context.collectionFactory.createOne({title: "abc", language}),
                    await context.collectionFactory.createOne({title: "def", language})
                ];
                const recordsCount = expectedCollections.length;

                const response = await makeRequest({sortBy: "title"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<LocalTestContext>("test sortBy createdDate", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedCollections = [
                    await context.collectionFactory.createOne({addedOn: new Date("2018-07-22T10:30:45.000Z"), language}),
                    await context.collectionFactory.createOne({addedOn: new Date("2023-03-15T20:29:42.000Z"), language}),
                ];
                const recordsCount = expectedCollections.length;

                const response = await makeRequest({sortBy: "createdDate"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<LocalTestContext>("test sortBy avgPastViewersCountPerText", async (context) => {
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();

                const language = await context.languageFactory.createOne();
                const expectedCollections = [
                    await context.collectionFactory.createOne({language, texts: []}),
                    await context.collectionFactory.createOne({language, texts: [context.textFactory.makeOne({language, pastViewers: []})]}),
                    await context.collectionFactory.createOne({
                        language,
                        texts: [context.textFactory.makeOne({language, pastViewers: [user1.profile]})]
                    }),
                    await context.collectionFactory.createOne({
                        language,
                        texts: [context.textFactory.makeOne({language, pastViewers: [user1.profile, user2.profile]})]
                    }),
                ];
                const recordsCount = expectedCollections.length;

                const response = await makeRequest({sortBy: "avgPastViewersCountPerText"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<LocalTestContext>("if sortBy is invalid return 400", async (context) => {
                const response = await makeRequest({sortBy: "somethin"});
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<LocalTestContext>("test sortOrder ascending", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedCollections = [
                    await context.collectionFactory.createOne({title: "abc", language}),
                    await context.collectionFactory.createOne({title: "def", language})
                ];
                const recordsCount = expectedCollections.length;

                const response = await makeRequest({sortOrder: "asc"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<LocalTestContext>("test sortOrder descending", async (context) => {
                const language = await context.languageFactory.createOne();
                const expectedCollections = [
                    await context.collectionFactory.createOne({title: "def", language}),
                    await context.collectionFactory.createOne({title: "abc", language}),
                ];
                const recordsCount = expectedCollections.length;

                const response = await makeRequest({sortOrder: "desc"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<LocalTestContext>("if sortBy is invalid return 400", async (context) => {
                const response = await makeRequest({sortOrder: "rising"});
                expect(response.statusCode).to.equal(400);
            });
        });
    });
    describe("test pagination", () => {
        describe("test page", () => {
            test<LocalTestContext>("If page is 1 return the first page of results", async (context) => {
                const allCollections = await context.collectionFactory.create(10, {language: await context.languageFactory.createOne()});
                allCollections.sort(defaultSortComparator);
                const recordsCount = allCollections.length;
                const page = 1, pageSize = 3;
                const expectedCollections = allCollections.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<LocalTestContext>("If page is 2 return the second page of results", async (context) => {
                const allCollections = await context.collectionFactory.create(10, {language: await context.languageFactory.createOne()});
                allCollections.sort(defaultSortComparator);
                const recordsCount = allCollections.length;
                const page = 2, pageSize = 3;
                const expectedCollections = allCollections.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<LocalTestContext>("If page is last return the last page of results", async (context) => {
                const allCollections = await context.collectionFactory.create(10, {language: await context.languageFactory.createOne()});
                allCollections.sort(defaultSortComparator);
                const recordsCount = allCollections.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedCollections = allCollections.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<LocalTestContext>("If page is more than last return empty page", async (context) => {
                const allCollections = await context.collectionFactory.create(10, {language: await context.languageFactory.createOne()});
                const recordsCount = allCollections.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize) + 1;
                const expectedCollections = allCollections.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: []
                });
            });
            describe("If page is invalid return 400", () => {
                test<LocalTestContext>("If page is less than 1 return 400", async (context) => {
                    const response = await makeRequest({page: 0, pageSize: 3});

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If page is not a number return 400", async (context) => {
                    const response = await makeRequest({page: "last", pageSize: 3});

                    expect(response.statusCode).to.equal(400);
                });
            });
        });
        describe("test pageSize", () => {
            test<LocalTestContext>("If pageSize is 20 split the results into 20 sized pages", async (context) => {
                const language = await context.languageFactory.createOne();
                const allCollections = await context.collectionFactory.create(50, {language});
                allCollections.sort(defaultSortComparator);
                const recordsCount = allCollections.length;
                const page = 2, pageSize = 20;
                const expectedCollections = allCollections.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

                const response = await makeRequest({page, pageSize});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
                expect(response.json().data.length).toBeLessThanOrEqual(pageSize);
            });
            describe("If pageSize is invalid return 400", () => {
                test<LocalTestContext>("If pageSize is too big return 400", async (context) => {
                    const response = await makeRequest({page: 1, pageSize: 250});

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If pageSize is negative return 400", async (context) => {
                    const response = await makeRequest({page: 1, pageSize: -20});

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If pageSize is not a number return 400", async (context) => {
                    const response = await makeRequest({page: 1, pageSize: "a lot"});

                    expect(response.statusCode).to.equal(400);
                });
            });
        });
    });
    test<LocalTestContext>("If logged in return collections with vocab levels for user", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const expectedCollections = await context.collectionFactory.create(5, {language});
        expectedCollections.sort(defaultSortComparator);
        await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
        const recordsCount = expectedCollections.length;

        const response = await makeRequest({}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: collectionSerializer.serializeList(expectedCollections)
        });
    });
    test<LocalTestContext>("If logged in as author of collections return private collections", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        const language = await context.languageFactory.createOne();
        const expectedCollections = [
            ...await context.collectionFactory.create(5, {language,}),
            ...await context.collectionFactory.create(5, {language, addedBy: user.profile}),
        ];
        expectedCollections.sort(defaultSortComparator);
        await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
        const recordsCount = expectedCollections.length;

        const response = await makeRequest({}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: collectionSerializer.serializeList(expectedCollections)
        });
    });
});

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
        test<LocalTestContext>("If optional fields are missing use default values", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();

            const newCollection = context.collectionFactory.makeOne({
                description: "",
                texts: [],
                addedBy: user.profile,
                language: language,
                image: "",
                vocabsByLevel: defaultVocabsByLevel()
            });

            const response = await makeRequest({
                title: newCollection.title,
                languageCode: language.code,
            }, session.token);

            const responseBody = response.json();
            expect(response.statusCode).to.equal(201);
            expect(responseBody).toMatchObject(collectionSerializer.serialize(newCollection, {ignore: ["addedOn"]}));

            const dbRecord = await context.collectionRepo.findOne({title: newCollection.title, language}, {populate: ["texts"]});
            expect(dbRecord).not.toBeNull();
            await context.collectionRepo.annotateCollectionsWithUserData([dbRecord!], user);
            expect(collectionSerializer.serialize(dbRecord!)).toMatchObject(collectionSerializer.serialize(newCollection, {ignore: ["addedOn"]}));
        });
        test<LocalTestContext>("If optional fields are provided use provided values", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const fileUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "collectionImage"});

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

            const responseBody = response.json();
            expect(response.statusCode).to.equal(201);
            expect(responseBody).toEqual(expect.objectContaining(collectionSerializer.serialize(newCollection, {ignore: ["addedOn"]})));

            const dbRecord = await context.collectionRepo.findOne({title: newCollection.title, language}, {populate: ["texts"]});
            expect(dbRecord).not.toBeNull();
            await context.collectionRepo.annotateCollectionsWithUserData([dbRecord!], user);
            expect(collectionSerializer.serialize(dbRecord!)).toMatchObject(collectionSerializer.serialize(newCollection, {ignore: ["addedBy"]}));
        });
    });
    test<LocalTestContext>("If user not logged in return 401", async (context) => {
        const language = await context.languageFactory.createOne();
        const newCollection = context.collectionFactory.makeOne({language});

        const response = await makeRequest({
            title: newCollection.title,
            languageCode: language.code,
        });

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
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
        test<LocalTestContext>("If title is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();

            const response = await makeRequest({
                languageCode: language.code
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If language is missing return 400", async (context) => {
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
        test<LocalTestContext>("If title is invalid return 400", async (context) => {
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
            test<LocalTestContext>("If languageCode is invalid return 400", async (context) => {
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
            test<LocalTestContext>("If language is not found return 400", async (context) => {
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
            test<LocalTestContext>("If language is not supported return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne({isSupported: false});
                const newCollection = context.collectionFactory.makeOne({language});

                const response = await makeRequest({
                    title: newCollection.title,
                    languageCode: language.code,
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
        test<LocalTestContext>("If description is invalid return 400", async (context) => {
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
        describe("If image is invalid return 400", () => {
            test<LocalTestContext>("If file upload request with key does not exist return 400", async (context) => {
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
            test<LocalTestContext>("If file upload request with key was not requested by user return 400", async (context) => {
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
            test<LocalTestContext>("If file upload request with key is not for collectionImage field return 400", async (context) => {
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

/**{@link CollectionController#getCollection}*/
describe("GET collections/:collectionId/", function () {
    const makeRequest = async (collectionId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `collections/${collectionId}/`,
        };
        return await fetchRequest(options, authToken);
    };

    describe("If the collection exists return the collection", () => {
        test<LocalTestContext>("If the user is not logged in return collection and texts without vocab levels", async (context) => {
            const collection = await context.collectionFactory.createOne({language: await context.languageFactory.createOne()});

            const response = await makeRequest(collection.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(collectionSerializer.serialize(collection));
        });
        test<LocalTestContext>("If the user is logged in return collection and texts with vocab levels", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const collection = await context.collectionFactory.createOne({language: await context.languageFactory.createOne()});
            await context.collectionRepo.annotateCollectionsWithUserData([collection], user);

            const response = await makeRequest(collection.id, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(collectionSerializer.serialize(collection));
        });
        test<LocalTestContext>("If the user is not author of hide private texts in collection", async (context) => {
            const user = await context.userFactory.createOne();
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({
                language, texts: context.textFactory.makeDefinitions(3, {addedBy: author.profile, language, isPublic: true, isLastInCollection: false}),
            });
            await Promise.all(Array.from({length: 3}).map((_, i) => context.textFactory.createOne({
                collection, language, addedBy: author.profile, isPublic: false,
                orderInCollection: collection.texts.length + i
            })));
            const response = await makeRequest(collection.id);


            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(collectionSerializer.serialize(collection));
        });
    });
    test<LocalTestContext>("If the collection does not exist return 404", async () => {
        const response = await makeRequest(faker.datatype.number({min: 10000000}));
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If collection id is invalid return 400", async () => {
        const response = await makeRequest(faker.random.alpha(8));
        expect(response.statusCode).to.equal(400);
    });
});

/**{@link CollectionController#updateCollection}*/
describe("PUT collections/:collectionId/", function () {
    const makeRequest = async (collectionId: number | string, body: object, authToken?: string) => {
        return await fetchRequest({
            method: "PUT",
            url: `collections/${collectionId}/`,
            body: body
        }, authToken);
    };

    describe("If the collection exists, user is logged in as author and all fields are valid, update collection and return 200", async () => {
        test<LocalTestContext>("If new image is not provided, keep old image", async (context) => {
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
            expect(response.json()).toEqual(collectionSerializer.serialize(collection));
            expect(response.json().texts.map((l: TextSchema) => l.id)).toEqual(shuffledTextIds);
            const updatedFields: (keyof CollectionSchema)[] = ["title", "description"];
            expect(collectionSerializer.serialize(collection, {include: updatedFields})).toEqual(collectionSerializer.serialize(updatedCollection, {include: updatedFields}));
        });
        test<LocalTestContext>("If new image is blank clear collection image", async (context) => {
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
            expect(response.json()).toEqual(collectionSerializer.serialize(collection));
            expect(collection.image).toEqual("");
            expect(response.json().texts.map((l: TextSchema) => l.id)).toEqual(shuffledTextIds);
            const updatedFields: (keyof CollectionSchema)[] = ["title", "description", "image"];
            expect(collectionSerializer.serialize(collection, {include: updatedFields})).toEqual(collectionSerializer.serialize(updatedCollection, {include: updatedFields}));
        });
        test<LocalTestContext>("If new image is provided, update collection image", async (context) => {
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
                image: fileUploadRequest.fileUrl
            });
            const shuffledTextIds = shuffleArray(collectionTexts).map(l => l.id);

            const response = await makeRequest(collection.id, {
                title: updatedCollection.title,
                description: updatedCollection.description,
                textsOrder: shuffledTextIds,
                image: fileUploadRequest.objectKey
            }, session.token);

            context.em.clear();
            collection = await context.collectionRepo.findOneOrFail({id: collection.id}, {populate: ["language", "addedBy", "addedBy.user", "addedBy.languagesLearning"]});
            await context.em.populate(collection, ["texts"], {orderBy: {texts: {orderInCollection: "asc"}}});
            await context.collectionRepo.annotateCollectionsWithUserData([collection], author);
            await context.textRepo.annotateTextsWithUserData(collection.texts.getItems(), author);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(collectionSerializer.serialize(collection));
            expect(response.json().texts.map((l: TextSchema) => l.id)).toEqual(shuffledTextIds);
            const updatedFields: (keyof CollectionSchema)[] = ["title", "description", "image"];
            expect(collectionSerializer.serialize(collection, {include: updatedFields})).toEqual(collectionSerializer.serialize(updatedCollection, {include: updatedFields}));
        });
    });
    test<LocalTestContext>("If user not logged in return 401", async (context) => {
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: [], image: ""});

        let textCounter = 0;
        const collectionTexts = await context.textFactory.each(l => {
            l.orderInCollection = textCounter;
            textCounter++;
        }).create(10, { collection, language, addedBy: author.profile});
        const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language});

        const response = await makeRequest(collection.id, {
            title: updatedCollection.title,
            description: updatedCollection.description,
            textsOrder: shuffleArray(collectionTexts).map(l => l.id)
        });

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const author = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: [], image: ""});

        let textCounter = 0;
        let collectionTexts = await context.textFactory.each(l => {
            l.orderInCollection = textCounter;
            textCounter++;
        }).create(10, { collection, language, addedBy: author.profile});
        const updatedCollection = await context.collectionFactory.makeOne({addedBy: author.profile, language});

        const response = await makeRequest(collection.id, {
            title: updatedCollection.title,
            description: updatedCollection.description,
            textsOrder: shuffleArray(collectionTexts).map(l => l.id)
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
    test<LocalTestContext>("If collection does not exist return 404", async (context) => {
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
    test<LocalTestContext>("If user is not author of collection return 403", async (context) => {
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
        }).create(10, { collection, language, addedBy: author.profile});
        const updatedCollection = await context.collectionFactory.makeOne({addedBy: author.profile, language});

        const response = await makeRequest(collection.id, {
            title: updatedCollection.title,
            description: updatedCollection.description,
            textsOrder: shuffleArray(collectionTexts).map(l => l.id)
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
    describe("If required fields are missing return 400", async () => {
        test<LocalTestContext>("If title is missing return 400", async (context) => {
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
        test<LocalTestContext>("If description is missing return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: [], image: ""});

            let textCounter = 0;
            let collectionTexts = await context.textFactory.each(l => {
                l.orderInCollection = textCounter;
                textCounter++;
            }).create(10, { collection, language, addedBy: author.profile});
            const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language});

            const response = await makeRequest(collection.id, {
                title: updatedCollection.title,
                textsOrder: shuffleArray(collectionTexts).map(l => l.id)
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If textsOrder is missing return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: [], image: ""});

            let textCounter = 0;
            await context.textFactory.each(l => {
                l.orderInCollection = textCounter;
                textCounter++;
            }).create(10, { collection, language, addedBy: author.profile});
            const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language});

            const response = await makeRequest(collection.id, {
                title: updatedCollection.title,
                description: updatedCollection.description,
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 400", async () => {
        test<LocalTestContext>("If title is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: [], image: ""});

            let textCounter = 0;
            let collectionTexts = await context.textFactory.each(l => {
                l.orderInCollection = textCounter;
                textCounter++;
            }).create(10, { collection, language, addedBy: author.profile});
            const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language});

            const response = await makeRequest(collection.id, {
                title: faker.random.alpha(300),
                description: updatedCollection.description,
                textsOrder: shuffleArray(collectionTexts).map(l => l.id)
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If description is invalid return 400", async (context) => {
            const author = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: author});
            const language = await context.languageFactory.createOne();
            const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: [], image: ""});

            let textCounter = 0;
            let collectionTexts = await context.textFactory.each(l => {
                l.orderInCollection = textCounter;
                textCounter++;
            }).create(10, { collection, language, addedBy: author.profile});
            const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language});

            const response = await makeRequest(collection.id, {
                title: updatedCollection.title,
                description: faker.random.alpha(600),
                textsOrder: shuffleArray(collectionTexts).map(l => l.id),
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        describe("If textsOrder is invalid return 400", async () => {
            test<LocalTestContext>("If textsOrder is not an array of integers return 400", async (context) => {
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
                test<LocalTestContext>("If textsOrder has any new text ids return 400", async (context) => {
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
                test<LocalTestContext>("If textsOrder is missing text ids return 400", async (context) => {
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
                    }).create(10, { collection, language, addedBy: author.profile});
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
                test<LocalTestContext>("If textsOrder has any repeated ids return 400", async (context) => {
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
                    }).create(10, { collection, language, addedBy: author.profile});
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
            test<LocalTestContext>("If file upload request with key does not exist return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: [], image: ""});
                const fileUploadRequest = await context.fileUploadRequestFactory.makeOne({user: author, fileField: "collectionImage"});

                let textCounter = 0;
                let collectionTexts = await context.textFactory.each(l => {
                    l.orderInCollection = textCounter;
                    textCounter++;
                }).create(10, { collection, language, addedBy: author.profile});
                const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language});

                const response = await makeRequest(collection.id, {
                    title: faker.random.alpha(300),
                    description: updatedCollection.description,
                    textsOrder: shuffleArray(collectionTexts).map(l => l.id),
                    image: fileUploadRequest.objectKey
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If file upload request with key was not requested by user return 400", async (context) => {
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
                }).create(10, { collection, language, addedBy: author.profile});
                const updatedCollection = context.collectionFactory.makeOne({addedBy: author.profile, language});

                const response = await makeRequest(collection.id, {
                    title: faker.random.alpha(300),
                    description: updatedCollection.description,
                    textsOrder: shuffleArray(collectionTexts).map(l => l.id),
                    image: fileUploadRequest.objectKey
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If file upload request with key is not for collectionImage field return 400", async (context) => {
                const author = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: author});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({addedBy: author.profile, language: language, texts: [], image: ""});
                const fileUploadRequest = await context.fileUploadRequestFactory.createOne({user: author, fileField: "textImage"});

                let textCounter = 0;
                let collectionTexts = await context.textFactory.each(l => {
                    l.orderInCollection = textCounter;
                    textCounter++;
                }).create(10, { collection, language, addedBy: author.profile});
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

/**{@link CollectionController#deleteCollection}*/
describe.todo("DELETE collections/:collectionId/", function () {
    test.todo<LocalTestContext>("");
});

/**{@link CollectionController#getUserBookmarkedCollections}*/
describe("GET users/me/collections/bookmarked/", function () {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/me/collections/bookmarked/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const queryDefaults = {pagination: {pageSize: 10, page: 1}};
    const defaultSortComparator = createComparator(Collection, [
        {property: "title", order: "asc"},
        {property: "id", order: "asc"}]
    );
    test<LocalTestContext>("If there are no filters return all collections user has bookmarked", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const language = await context.languageFactory.createOne();
        const expectedCollections = await context.collectionFactory.create(3, {language, bookmarkers: user.profile});
        await context.collectionFactory.create(3, {language});
        await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
        expectedCollections.sort(defaultSortComparator);
        const recordsCount = expectedCollections.length;

        const response = await makeRequest({}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual({
            page: queryDefaults.pagination.page,
            pageSize: queryDefaults.pagination.pageSize,
            pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
            data: collectionSerializer.serializeList(expectedCollections)
        });
    });
    describe("test languageCode filter", () => {
        test<LocalTestContext>("If language filter is valid and language exists only return collections in that language that user has bookmarked", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const language1 = await context.languageFactory.createOne();
            const language2 = await context.languageFactory.createOne();
            const expectedCollections = await context.collectionFactory.create(3, {language: language1, bookmarkers: user.profile});
            await context.collectionFactory.create(3, {language: language2, bookmarkers: user.profile});
            await context.collectionFactory.create(3, {language: language1});
            await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
            expectedCollections.sort(defaultSortComparator);
            const recordsCount = expectedCollections.length;

            const response = await makeRequest({languageCode: language1.code}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: collectionSerializer.serializeList(expectedCollections)
            });
        });
        test<LocalTestContext>("If language does not exist return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            await context.collectionFactory.create(3, {language: await context.languageFactory.createOne(), bookmarkers: user.profile});

            const response = await makeRequest({languageCode: faker.random.alpha({count: 4})}, session.token);
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: 0,
                data: []
            });
        });
        test<LocalTestContext>("If language filter is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const response = await makeRequest({languageCode: 12345}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test addedBy filter", () => {
        test<LocalTestContext>("If addedBy filter is valid and user exists only return collections added by that user that current user has bookmarked", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();

            const user1 = await context.userFactory.createOne();
            const user2 = await context.userFactory.createOne();
            const expectedCollections = await context.collectionFactory.create(3, {language, addedBy: user1.profile, bookmarkers: user.profile});
            await context.collectionFactory.create(3, {language, addedBy: user2.profile, bookmarkers: user.profile});
            await context.collectionFactory.create(3, {language, addedBy: user1.profile});
            await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
            expectedCollections.sort(defaultSortComparator);
            const recordsCount = expectedCollections.length;

            const response = await makeRequest({addedBy: user1.username}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: collectionSerializer.serializeList(expectedCollections)
            });
        });
        test<LocalTestContext>("If addedBy is me and signed in return collections added by current user that they have bookmarked", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();

            const otherUser = await context.userFactory.createOne();
            const expectedCollections = await context.collectionFactory.create(3, {language, addedBy: user.profile, bookmarkers: user.profile});
            await context.collectionFactory.create(3, {language, addedBy: otherUser.profile, bookmarkers: user.profile});
            await context.collectionFactory.create(3, {language, addedBy: user.profile});
            await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
            expectedCollections.sort(defaultSortComparator);
            const recordsCount = expectedCollections.length;

            const response = await makeRequest({addedBy: "me"}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: collectionSerializer.serializeList(expectedCollections)
            });
        });
        test<LocalTestContext>("If user does not exist return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            await context.collectionFactory.create(3, {language: await context.languageFactory.createOne(), bookmarkers: user.profile});

            const response = await makeRequest({addedBy: faker.random.alpha({count: 20})}, session.token);
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: 0,
                data: []
            });
        });
        test<LocalTestContext>("If addedBy filter is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const response = await makeRequest({addedBy: "!@#%#%^#^!"}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("test searchQuery filter", () => {
        test<LocalTestContext>("If searchQuery is valid return collections with query in title or description", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const language = await context.languageFactory.createOne();
            const searchQuery = "search query";
            const expectedCollections = [
                await context.collectionFactory.createOne({
                    language,
                    bookmarkers: user.profile,
                    title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`
                }),
                await context.collectionFactory.createOne({
                    language,
                    bookmarkers: user.profile,
                    description: `description ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`
                })
            ];
            await context.collectionFactory.create(3, {
                language: language,
                title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`
            });
            await context.collectionFactory.create(3, {
                language: language,
                description: `description ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`
            });
            await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
            expectedCollections.sort(defaultSortComparator);
            const recordsCount = expectedCollections.length;

            const response = await makeRequest({searchQuery: searchQuery}, session.token);
            expect(response.statusCode).to.equal(200);

            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                data: collectionSerializer.serializeList(expectedCollections)
            });
        });
        test<LocalTestContext>("If searchQuery is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})}, session.token);

            expect(response.statusCode).to.equal(400);
        });
        test<LocalTestContext>("If no collections match search query return empty list", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            await context.collectionFactory.create(3, {language: await context.languageFactory.createOne(), bookmarkers: user.profile});

            const response = await makeRequest({searchQuery: faker.random.alpha({count: 200})}, session.token);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual({
                page: queryDefaults.pagination.page,
                pageSize: queryDefaults.pagination.pageSize,
                pageCount: 0,
                data: []
            });
        });
    });
    describe("test sort", () => {
        describe("test sortBy", () => {
            test<LocalTestContext>("test sortBy title", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedCollections = [
                    await context.collectionFactory.createOne({title: "abc", bookmarkers: user.profile, language}),
                    await context.collectionFactory.createOne({title: "def", bookmarkers: user.profile, language})
                ];
                await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
                const recordsCount = expectedCollections.length;

                const response = await makeRequest({sortBy: "title"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<LocalTestContext>("test sortBy createdDate", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedCollections = [
                    await context.collectionFactory.createOne({
                        addedOn: new Date("2018-07-22T10:30:45.000Z"),
                        bookmarkers: user.profile,
                        language
                    }),
                    await context.collectionFactory.createOne({
                        addedOn: new Date("2023-03-15T20:29:42.000Z"),
                        bookmarkers: user.profile,
                        language
                    }),
                ];
                await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
                const recordsCount = expectedCollections.length;

                const response = await makeRequest({sortBy: "createdDate"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<LocalTestContext>("test sortBy avgPastViewersCountPerText", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();

                const language = await context.languageFactory.createOne();
                const expectedCollections = [
                    await context.collectionFactory.createOne({language, bookmarkers: user.profile, texts: []}),
                    await context.collectionFactory.createOne({
                        language,
                        bookmarkers: user.profile,
                        texts: [context.textFactory.makeOne({language, pastViewers: []})]
                    }),
                    await context.collectionFactory.createOne({
                        language,
                        bookmarkers: user.profile,
                        texts: [context.textFactory.makeOne({language, pastViewers: [user1.profile]})]
                    }),
                    await context.collectionFactory.createOne({
                        language,
                        bookmarkers: user.profile,
                        texts: [context.textFactory.makeOne({language, pastViewers: [user1.profile, user2.profile]})]
                    }),
                ];
                await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
                const recordsCount = expectedCollections.length;

                const response = await makeRequest({sortBy: "avgPastViewersCountPerText"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<LocalTestContext>("if sortBy is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const response = await makeRequest({sortBy: "texts"}, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<LocalTestContext>("test sortOrder ascending", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedCollections = [
                    await context.collectionFactory.createOne({title: "abc", bookmarkers: user.profile, language}),
                    await context.collectionFactory.createOne({title: "def", bookmarkers: user.profile, language})
                ];
                await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
                const recordsCount = expectedCollections.length;

                const response = await makeRequest({sortOrder: "asc"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<LocalTestContext>("test sortOrder descending", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const expectedCollections = [
                    await context.collectionFactory.createOne({title: "def", bookmarkers: user.profile, language}),
                    await context.collectionFactory.createOne({title: "abc", bookmarkers: user.profile, language}),
                ];
                await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);
                const recordsCount = expectedCollections.length;

                const response = await makeRequest({sortOrder: "desc"}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: queryDefaults.pagination.page,
                    pageSize: queryDefaults.pagination.pageSize,
                    pageCount: Math.ceil(recordsCount / queryDefaults.pagination.pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<LocalTestContext>("if sortBy is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const response = await makeRequest({sortOrder: "rising"}, session.token);
                expect(response.statusCode).to.equal(400);
            });
        });
    });
    describe("test pagination", () => {
        describe("test page", () => {
            test<LocalTestContext>("If page is 1 return the first page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allCollections = await context.collectionFactory.create(10, {language, bookmarkers: user.profile});
                allCollections.sort(defaultSortComparator);
                const recordsCount = allCollections.length;
                const page = 1, pageSize = 3;
                const expectedCollections = allCollections.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<LocalTestContext>("If page is 2 return the second page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allCollections = await context.collectionFactory.create(10, {language, bookmarkers: user.profile});
                allCollections.sort(defaultSortComparator);
                const recordsCount = allCollections.length;
                const page = 2, pageSize = 3;
                const expectedCollections = allCollections.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<LocalTestContext>("If page is last return the last page of results", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allCollections = await context.collectionFactory.create(10, {language, bookmarkers: user.profile});
                allCollections.sort(defaultSortComparator);
                const recordsCount = allCollections.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize);
                const expectedCollections = allCollections.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
            });
            test<LocalTestContext>("If page is more than last return empty page", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allCollections = await context.collectionFactory.create(10, {language, bookmarkers: user.profile});
                const recordsCount = allCollections.length;
                const pageSize = 3;
                const page = Math.ceil(recordsCount / pageSize) + 1;
                const expectedCollections = allCollections.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: []
                });
            });
            describe("If page is invalid return 400", () => {
                test<LocalTestContext>("If page is less than 1 return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user});
                    const response = await makeRequest({page: 0, pageSize: 3}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If page is not a number return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user});
                    const response = await makeRequest({page: "last", pageSize: 3}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
            });
        });
        describe("test pageSize", () => {
            test<LocalTestContext>("If pageSize is 20 split the results into 20 sized pages", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const allCollections = await context.collectionFactory.create(50, {language, bookmarkers: user.profile});
                allCollections.sort(defaultSortComparator);
                const recordsCount = allCollections.length;
                const page = 2, pageSize = 20;
                const expectedCollections = allCollections.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
                await context.collectionRepo.annotateCollectionsWithUserData(expectedCollections, user);

                const response = await makeRequest({page, pageSize}, session.token);

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual({
                    page: page,
                    pageSize: pageSize,
                    pageCount: Math.ceil(recordsCount / pageSize),
                    data: collectionSerializer.serializeList(expectedCollections)
                });
                expect(response.json().data.length).toBeLessThanOrEqual(pageSize);
            });
            describe("If pageSize is invalid return 400", () => {
                test<LocalTestContext>("If pageSize is too big return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user});
                    const response = await makeRequest({page: 1, pageSize: 250}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If pageSize is negative return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user});
                    const response = await makeRequest({page: 1, pageSize: -20}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
                test<LocalTestContext>("If pageSize is not a number return 400", async (context) => {
                    const user = await context.userFactory.createOne();
                    const session = await context.sessionFactory.createOne({user});
                    const response = await makeRequest({page: 1, pageSize: "a lot"}, session.token);

                    expect(response.statusCode).to.equal(400);
                });
            });
        });
    });
});

/**{@link CollectionController#addCollectionToUserBookmarks}*/
describe("POST users/me/collections/bookmarked/", function () {
    const makeRequest = async (body: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "POST",
            url: `users/me/collections/bookmarked/`,
            payload: body
        };
        return await fetchRequest(options, authToken);
    };

    test<LocalTestContext>("If the collection exists add collection to user's bookmarked collections", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne({learners: user.profile});
        const expectedCollection = await context.collectionFactory.createOne({language});
        await context.collectionRepo.annotateCollectionsWithUserData([expectedCollection], user);

        const response = await makeRequest({collectionId: expectedCollection.id}, session.token);

        expectedCollection.isBookmarked = true;
        expect(response.statusCode).to.equal(201);
        expect(response.json()).toEqual(collectionSerializer.serialize(expectedCollection));
        const dbRecord = await context.em.findOne(CollectionBookmark, {bookmarker: user.profile, collection: expectedCollection});
        expect(dbRecord).not.toBeNull();
        expect(collectionSerializer.serialize(dbRecord!.collection)).toEqual(collectionSerializer.serialize(expectedCollection));
    });
    describe("If required fields are missing return 400", function () {
        test<LocalTestContext>("If the collectionId is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const response = await makeRequest({}, session.token);
            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid return 400", function () {
        describe("If the collection is invalid return 400", async () => {
            test<LocalTestContext>("If the collectionId is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest({collectionId: faker.random.alpha(10)}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If the collection is not found return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});

                const response = await makeRequest({collectionId: faker.datatype.number({min: 100000})}, session.token);
                expect(response.statusCode).to.equal(400);
            });
            test<LocalTestContext>("If the collection is not in a language the user is learning return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({language});

                const response = await makeRequest({collectionId: collection.id}, session.token);

                expect(response.statusCode).to.equal(400);
            });
        });
    });
    test<LocalTestContext>("If user is not logged in return 401", async () => {
        const response = await makeRequest({});
        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({language});

        const response = await makeRequest({collectionId: collection.id}, session.token);
        expect(response.statusCode).to.equal(403);
    });
});

/**{@link CollectionController#removeCollectionFromUserBookmarks}*/
describe("DELETE users/me/collections/bookmarked/:collectionId", function () {
    const makeRequest = async (collectionId: number, authToken?: string) => {
        const options: InjectOptions = {
            method: "DELETE",
            url: `users/me/collections/bookmarked/${collectionId}/`
        };
        return await fetchRequest(options, authToken);
    };

    test<LocalTestContext>("If user is logged in and is collection is bookmarked delete bookmark, return 204", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({language, bookmarkers: user.profile});

        const response = await makeRequest(collection.id, session.token);

        expect(response.statusCode).to.equal(204);
        expect(await context.em.findOne(CollectionBookmark, {bookmarker: user.profile, collection: collection})).toBeNull();
    });
    test<LocalTestContext>("If user is not logged in return 401", async (context) => {
        const user = await context.userFactory.createOne();
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({language, bookmarkers: user.profile});

        const response = await makeRequest(collection.id);

        expect(response.statusCode).to.equal(401);
    });
    test<LocalTestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({language, bookmarkers: user.profile});

        const response = await makeRequest(collection.id, session.token);

        expect(response.statusCode).to.equal(403);
    });
    test<LocalTestContext>("If collectionId is invalid return  400", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const response = await makeRequest(-1, session.token);

        expect(response.statusCode).to.equal(400);
    });
    test<LocalTestContext>("If collection is not found return  404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});

        const response = await makeRequest(faker.datatype.number({min: 100000}), session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If collection is not bookmarked return  404", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const language = await context.languageFactory.createOne();
        const collection = await context.collectionFactory.createOne({language});

        const response = await makeRequest(collection.id, session.token);

        expect(response.statusCode).to.equal(404);
    });
});
