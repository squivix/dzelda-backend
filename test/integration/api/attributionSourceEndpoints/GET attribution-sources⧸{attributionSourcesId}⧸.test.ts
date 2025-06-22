import {describe, expect, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {faker} from "@faker-js/faker";
import {AttributionSource} from "@/src/models/entities/AttributionSource.js";
import {attributionSourceSerializer} from "@/src/presentation/response/serializers/AttributionSource/AttributionSourceSerializer.js";

/**{@link MeaningController#getAttributionSource}*/
describe("GET attribution-sources/{attributionSourcesId}/", function () {
    const makeRequest = async (attributionSourceId: number | string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `attribution-sources/${attributionSourceId}/`,
        };
        return await fetchRequest(options);
    };

    test<TestContext>("If attribution source exists return the attribution source", async (context) => {
        const expectedSource = context.em.create(AttributionSource, {
            name: faker.word.noun(2),
            url: faker.internet.url(),
            logoUrl: faker.internet.url(),
        });
        await context.em.flush();

        const response = await makeRequest(expectedSource.id);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(attributionSourceSerializer.serialize(expectedSource));
    });

    test<TestContext>("If attribution source does not exist return 404", async () => {
        const response = await makeRequest(faker.datatype.number({min: 1000000}));
        expect(response.statusCode).to.equal(404);
    });

    test<TestContext>("If attribution source id is invalid return 400", async () => {
        const response = await makeRequest(faker.random.alpha(8));
        expect(response.statusCode).to.equal(400);
    });
})