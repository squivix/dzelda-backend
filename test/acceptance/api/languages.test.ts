import {beforeEach, describe, expect, test} from "vitest";
import {faker} from "@faker-js/faker";
import {orm} from "@/src/server.js";
import {LanguageFactory} from "@/src/seeders/factories/LanguageFactory.js";
import {clearDb} from "@/test/utils.js";
import {buildQueryString, fetchRequest} from "@/test/acceptance/api/utils.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";
import {InjectOptions} from "light-my-request";

beforeEach(async () => clearDb());
describe("GET /languages/", function () {
    const languageFactory = () => new LanguageFactory(orm.em.fork());

    const getLanguagesRequest = async (queryParams: object = {}) => {
        return await fetchRequest({
            method: "GET",
            url: `languages/${buildQueryString(queryParams)}`,
        });
    };

    test("test if there are no filters return all languages", async () => {
        const languages = await languageFactory().create(10);

        const response = await getLanguagesRequest();
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(languages.map(l => l.toObject()));
    });

    test("test if there are invalid filters return all languages", async () => {
        const languages = await languageFactory().create(10);

        const response = await getLanguagesRequest({[faker.datatype.string()]: faker.random.word()});
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(languages.map(l => l.toObject()));
    });

    describe("test if there are filters languages that match those filters", async () => {
        describe("test isSupported filter", async () => {
            test("test if isSupported filter is true return only supported languages", async () => {
                const supportedLanguages = await languageFactory().create(5, {isSupported: true});
                const unsupportedLanguages = await languageFactory().create(5, {isSupported: false});

                const response = await getLanguagesRequest({isSupported: true});
                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(supportedLanguages.map(l => l.toObject()));
            });
            test("test if isSupported filter is false return only unsupported languages", async () => {
                const supportedLanguages = await languageFactory().create(5, {isSupported: true});
                const unsupportedLanguages = await languageFactory().create(5, {isSupported: false});

                const response = await getLanguagesRequest({isSupported: false});
                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(unsupportedLanguages.map(l => l.toObject()));
            });
            test("test if isSupported filter is invalid ignore filter", async () => {
                const supportedLanguages = await languageFactory().create(5, {isSupported: true});
                const unsupportedLanguages = await languageFactory().create(5, {isSupported: false});
                const allLanguages = [...supportedLanguages, ...unsupportedLanguages];

                const response = await getLanguagesRequest({isSupported: "Invalid data"});
                expect(response.statusCode).to.equal(400);
            });
        });
    });
});

describe("GET users/:username/languages/", function () {
    const userFactory = () => new UserFactory(orm.em.fork());
    const sessionFactory = () => new SessionFactory(orm.em.fork());
    const languageFactory = () => new LanguageFactory(orm.em.fork());

    const getResourceRequest = async (username: string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/${username}/languages/`,
        };
        if (authToken)
            options.headers = {authorization: `Token ${authToken}`};
        return await fetchRequest(options);
    };

    test("test if username does not exist return 404", async () => {
        const response = await getResourceRequest(faker.random.alphaNumeric(20));
        expect(response.statusCode).to.equal(404);
    });
    test(`test if username exists and is not public and not authenticated as user return 404`, async () => {
        const user = await userFactory().createOne({profile: {isPublic: false}});
        const languages = await languageFactory().create(10, {learners: user.profile});

        const response = await getResourceRequest(user.username);
        expect(response.statusCode).to.equal(404);
    });
    test(`test if username exists and is public return languages`, async () => {
        const user = await userFactory().createOne({profile: {isPublic: true}});
        const languages = await languageFactory().create(10, {learners: user.profile});
        const response = await getResourceRequest(user.username);
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(languages.map(l => l.toObject()));
    });
    test(`test if username exists and is not public but authenticated as user return languages`, async () => {
        const user = await userFactory().createOne({profile: {isPublic: false}});
        const languages = await languageFactory().create(10, {learners: user.profile});
        const session = await sessionFactory().createOne({user: user});

        const response = await getResourceRequest(user.username, session.token);
        expect(response.statusCode).to.equal(200);

        expect(response.json()).toEqual(languages.map(l => l.toObject()));
    });
    test(`test if username is me and not authenticated as user return 401`, async () => {
        const user = await userFactory().createOne({profile: {isPublic: false}});
        const languages = await languageFactory().create(10, {learners: user.profile});

        const response = await getResourceRequest("me");
        expect(response.statusCode).to.equal(401);
    });
    test(`test if username is me and authenticated as user return languages`, async () => {
        const user = await userFactory().createOne({profile: {isPublic: false}});
        const languages = await languageFactory().create(10, {learners: user.profile});
        const session = await sessionFactory().createOne({user: user});

        const response = await getResourceRequest("me", session.token);
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(languages.map(l => l.toObject()));
    });
});