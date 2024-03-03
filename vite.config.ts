/// <reference types="vitest" />

// Configure Vitest (https://vitest.dev/config/)

import {defineConfig} from "vite";
import {defaultExclude} from "vitest/config";
import path from "path";

export default defineConfig({
    plugins: [],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "."),
        },
    },
    server: {
        hmr: false      //debugging line numbers wrong with hmr :(
    },
    test: {
        exclude: [...defaultExclude, "build/**"],
        fileParallelism: false,
        globalSetup: ["./tests/globalSetup.ts",],
        setupFiles: [
            "./tests/setup.ts"
        ],
        restoreMocks: true,
        testTimeout: 10_000
    },
});
