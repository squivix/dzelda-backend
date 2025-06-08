import {describe, test, TestContext} from "vitest";
import {InjectOptions} from "light-my-request";
import {buildQueryString, createComparator, fetchRequest} from "@/tests/integration/utils.js";
import {Text} from "@/src/models/entities/Text.js";


/**{@link TextController#getUserHiddenTexts}*/
describe("GET users/me/texts/hidden/", () => {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/me/texts/hidden/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
    };
    const defaultSortComparator = createComparator(Text, [
        {property: "title", order: "asc"},
        {property: "id", order: "asc"}
    ]);
    test.todo<TestContext>("If user is logged in and there are no filters return hidden texts by user", async (context) => {
    });
    describe("test languageCode filter", () => {
        test.todo<TestContext>("If language filter is valid and language exists only return hidden texts in that language", async (context) => {
        });
        test.todo<TestContext>("If language does not exist return empty list", async (context) => {
        });
        test.todo<TestContext>("If language filter is invalid return 400", async (context) => {
        });
    });
    describe("test addedBy filter", () => {
        test.todo<TestContext>("If addedBy filter is valid and user exists only return hidden texts added by that user", async (context) => {
        });
        test.todo<TestContext>("If addedBy is me and signed in return hidden texts added by that user", async (context) => {
        });
        test.todo<TestContext>("If user does not exist return empty list", async (context) => {
        });
        test.todo<TestContext>("If addedBy filter is invalid return 400", async (context) => {
        });
    });
    describe("test searchQuery filter", () => {
        test.todo<TestContext>("If searchQuery is valid return hidden texts with query in title", async (context) => {
        });
        test.todo<TestContext>("If searchQuery is invalid return 400", async (context) => {
        });
        test.todo<TestContext>("If no texts match search query return empty list", async (context) => {
        });
    });
    describe("test hasAudio filter", () => {
        test.todo<TestContext>("If hasAudio is true return hidden texts with audio", async (context) => {
        });
        test.todo<TestContext>("If hasAudio is false return hidden texts with no audio", async (context) => {
        });
        test.todo<TestContext>("If hasAudio is invalid return 400", async (context) => {
        });
    });
    describe("test sort", () => {
        describe("test sortBy", () => {
            test.todo<TestContext>("test sortBy title", async (context) => {
            });
            test.todo<TestContext>("test sortBy createdDate", async (context) => {
            });
            test.todo<TestContext>("test sortBy pastViewersCount", async (context) => {
            });
            test.todo<TestContext>("if sortBy is invalid return 400", async (context) => {
            });
        });
        describe("test sortOrder", () => {
            test.todo<TestContext>("If sortOrder is asc return the texts in ascending order", async (context) => {
            });
            test.todo<TestContext>("If sortOrder is desc return the texts in descending order", async (context) => {
            });
            test.todo<TestContext>("If sortBy is invalid return 400", async (context) => {
            });
        });
    });
    describe("test pagination", () => {
        describe("test page", () => {
            test.todo<TestContext>("If page is 1 return the first page of results", async (context) => {
            });
            test.todo<TestContext>("If page is 2 return the second page of results", async (context) => {
            });
            test.todo<TestContext>("If page is last return the last page of results", async (context) => {
            });
            test.todo<TestContext>("If page is more than last return empty page", async (context) => {
            });
            describe("If page is invalid return 400", () => {
                test.todo<TestContext>("If page is less than 1 return 400", async (context) => {
                });
                test.todo<TestContext>("If page is not a number return 400", async (context) => {
                });
            });
        });
        describe("test pageSize", () => {
            test.todo<TestContext>("If pageSize is 20 split the results into 20 sized pages", async (context) => {
            });
            describe("If pageSize is invalid return 400", () => {
                test.todo<TestContext>("If pageSize is too big return 400", async (context) => {
                });
                test.todo<TestContext>("If pageSize is negative return 400", async (context) => {
                });
                test.todo<TestContext>("If pageSize is not a number return 400", async (context) => {
                });
            });
        });
    });
    test.todo<TestContext>("If user is not logged in return 401", async () => {
    });
    test.todo<TestContext>("If user email is not confirmed return 403", async (context) => {
    });
});