import {beforeEach, describe, expect, test} from "vitest";
import {buildQueryString, fetchRequest} from "./utils.js";
import {LanguageFactory} from "../../../src/seeders/factories/LanguageFactory.js";
import {faker} from "@faker-js/faker";
import {orm} from "../../../src/server.js";
import {clearDb} from "../../utils.js";

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