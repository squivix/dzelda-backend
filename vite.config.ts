/// <reference types="vitest" />

// Configure Vitest (https://vitest.dev/config/)

import {defineConfig} from "vite";
import {defaultExclude} from "vitest/config";
import path from "path";

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '/build'),
        },
    },
    test: {
        /* for example, use global to avoid globals imports (describe, test, expect): */

        exclude: [...defaultExclude, "build/**"],
        threads: false,
        // coverage: {
        //     provider: "istanbul"
        // }
    },
});