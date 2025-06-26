import {expect} from "vitest";

expect.extend({
    arrayEqualRegardlessOfOrder(actual: unknown, expected: Array<any>) {
        if (!Array.isArray(actual)) {
            return {
                pass: false,
                message: () => `expected, an array: ${JSON.stringify(expected)}, received ${actual}`
            }
        }
        if (actual.length !== expected.length) {
            return {
                pass: false,
                message: () => `expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
            }
        }
        const sortedExpected = [...expected].sort();
        const sortedActual = [...actual].sort();

        expect(sortedActual).toEqual(sortedExpected)

        return {pass: true, message: () => `expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`}
    }
})
