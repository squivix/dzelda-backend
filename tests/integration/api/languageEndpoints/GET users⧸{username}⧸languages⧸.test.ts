import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {buildQueryString, createComparator, fetchRequest} from "@/tests/integration/utils.js";
import {Language} from "@/src/models/entities/Language.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {learnerLanguageSerializer} from "@/src/presentation/response/serializers/mappings/LearnerLanguageSerializer.js";
import {faker} from "@faker-js/faker";
import {RequiredEntityData} from "@mikro-orm/core";

/**{@link LanguageController#getUserLanguages}*/
describe("GET users/{username}/languages/", function () {
    const makeRequest = async (username: string, queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/${username}/languages/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const defaultSortComparator = createComparator(Language, [
        {property: "name", order: "asc"},
        {property: "code", order: "asc"},
        {property: "id", order: "asc"}
    ]);
    test<TestContext>(`If username exists and is public return languages user is learning`, async (context) => {
        const user = await context.userFactory.createOne({profile: {isPublic: true}});
        const expectedLanguages = await context.languageFactory.create(10);
        expectedLanguages.sort(defaultSortComparator);
        const expectedMappings = expectedLanguages.map(language => {
            language.learnersCount++;
            return context.em.create(MapLearnerLanguage, {language, learner: user.profile});
        });
        await context.em.flush();

        const response = await makeRequest(user.username);

        //TODO hide lastOpened from other users
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(learnerLanguageSerializer.serializeList(expectedMappings));
    });
    test<TestContext>("If username does not exist return 404", async () => {
        const response = await makeRequest(faker.random.alphaNumeric(20));
        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>(`If username exists and is not public and not authenticated as user return 404`, async (context) => {
        const user = await context.userFactory.createOne({profile: {isPublic: false}});
        await context.languageFactory.create(10, {learners: user.profile});

        const response = await makeRequest(user.username);
        expect(response.statusCode).to.equal(404);
    });
    test<TestContext>(`If username exists and is not public but authenticated as user return languages`, async (context) => {
        const user = await context.userFactory.createOne({profile: {isPublic: false}});
        const session = await context.sessionFactory.createOne({user: user});
        const expectedLanguages = await context.languageFactory.create(10);
        expectedLanguages.sort(defaultSortComparator);
        const expectedMappings = expectedLanguages.map(language => {
            language.learnersCount++;
            return context.em.create(MapLearnerLanguage, {language, learner: user.profile});
        });
        await context.em.flush();

        const response = await makeRequest(user.username, {}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(learnerLanguageSerializer.serializeList(expectedMappings));
    });
    test<TestContext>(`If username is me and not authenticated as user return 401`, async (context) => {
        const user = await context.userFactory.createOne({profile: {isPublic: false}});
        await context.languageFactory.create(10, {learners: user.profile});

        const response = await makeRequest("me");
        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>(`If username is me and authenticated as user return languages`, async (context) => {
        const user = await context.userFactory.createOne({profile: {isPublic: false}});
        const session = await context.sessionFactory.createOne({user: user});
        const expectedLanguages = await context.languageFactory.create(10);
        expectedLanguages.sort(defaultSortComparator);
        const expectedMappings = expectedLanguages.map(language => {
            language.learnersCount++;
            return context.em.create(MapLearnerLanguage, {language, learner: user.profile});
        });
        await context.em.flush();

        const response = await makeRequest("me", {}, session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(learnerLanguageSerializer.serializeList(expectedMappings));
    });

    describe("test sort", () => {
        describe("test sortBy", () => {
            test<TestContext>("test sortBy name", async (context) => {
                const user = await context.userFactory.createOne({profile: {isPublic: true}});
                const expectedLanguages = [
                    await context.languageFactory.createOne({name: "abc"}),
                    await context.languageFactory.createOne({name: "def"})
                ];
                const expectedMappings = expectedLanguages.map(language => {
                    language.learnersCount++;
                    return context.em.create(MapLearnerLanguage, {language, learner: user.profile});
                });
                await context.em.flush();

                const response = await makeRequest(user.username, {sortBy: "name"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(learnerLanguageSerializer.serializeList(expectedMappings));
            });
            test<TestContext>("test sortBy learnersCount", async (context) => {
                const user = await context.userFactory.createOne({profile: {isPublic: true}});
                const user1 = await context.userFactory.createOne();
                const user2 = await context.userFactory.createOne();
                const expectedLanguages = [
                    await context.languageFactory.createOne({learners: []}),
                    await context.languageFactory.createOne({learners: [user1.profile]}),
                    await context.languageFactory.createOne({learners: [user1.profile, user2.profile]})
                ];
                const expectedMappings = expectedLanguages.map(language => {
                    language.learnersCount++;
                    return context.em.create(MapLearnerLanguage, {language, learner: user.profile});
                });
                await context.em.flush();

                const response = await makeRequest(user.username, {sortBy: "learnersCount"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(learnerLanguageSerializer.serializeList(expectedMappings));
            });
            test<TestContext>("test sortBy lastOpened", async (context) => {
                const user = await context.userFactory.createOne({profile: {isPublic: true}});
                const expectedMappings = [
                    context.em.create(MapLearnerLanguage, {
                        language: context.languageFactory.makeDefinition({learnersCount: 1}), learner: user.profile,
                        lastOpened: new Date("2018-07-22T10:30:45.000Z")
                    } as RequiredEntityData<MapLearnerLanguage>),
                    context.em.create(MapLearnerLanguage, {
                        language: context.languageFactory.makeDefinition({learnersCount: 1}), learner: user.profile,
                        lastOpened: new Date("2023-03-15T20:29:42.000Z")
                    } as RequiredEntityData<MapLearnerLanguage>),
                ];
                await context.em.flush();

                const response = await makeRequest(user.username, {sortBy: "lastOpened"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(learnerLanguageSerializer.serializeList(expectedMappings));
            });
            test<TestContext>("if sortBy is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne({profile: {isPublic: true}});

                const response = await makeRequest(user.username, {sortBy: "flag"});

                expect(response.statusCode).to.equal(400);
            });
        });
        describe("test sortOrder", () => {
            test<TestContext>("If sortOrder is asc return the languages in ascending order", async (context) => {
                const user = await context.userFactory.createOne({profile: {isPublic: true}});
                const expectedLanguages = [
                    await context.languageFactory.createOne({name: "abc"}),
                    await context.languageFactory.createOne({name: "def"})
                ];
                const expectedMappings = expectedLanguages.map(language => {
                    language.learnersCount++;
                    return context.em.create(MapLearnerLanguage, {language, learner: user.profile});
                });
                await context.em.flush();

                const response = await makeRequest(user.username, {sortOrder: "asc"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(learnerLanguageSerializer.serializeList(expectedMappings));
            });
            test<TestContext>("If sortOrder is desc return the languages in descending order", async (context) => {
                const user = await context.userFactory.createOne({profile: {isPublic: true}});
                const expectedLanguages = [
                    await context.languageFactory.createOne({name: "def"}),
                    await context.languageFactory.createOne({name: "abc"}),
                ];
                const expectedMappings = expectedLanguages.map(language => {
                    language.learnersCount++;
                    return context.em.create(MapLearnerLanguage, {language, learner: user.profile});
                });
                await context.em.flush();

                const response = await makeRequest(user.username, {sortOrder: "desc"});

                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(learnerLanguageSerializer.serializeList(expectedMappings));
            });
            test<TestContext>("If sortOrder is invalid return 400", async (context) => {
                const user = await context.userFactory.createOne({profile: {isPublic: true}});

                const response = await makeRequest(user.username, {sortOrder: "rising"});

                expect(response.statusCode).to.equal(400);
            });
        });
    });
});
