/// <reference types="vitest" />

// Configure Vitest (https://vitest.dev/config/)

import {defineConfig} from "vite";
import {defaultExclude} from "vitest/config";

export default defineConfig({
    test: {
        /* for example, use global to avoid globals imports (describe, test, expect): */
        // globals: true,

        exclude: [...defaultExclude, "build/**"],
        threads: false,
        dangerouslyIgnoreUnhandledErrors: true,
        // coverage: {
        //     provider: "istanbul"
        // }
    },
});