/// <reference types="vitest" />

// Configure Vitest (https://vitest.dev/config/)

import {defineConfig} from "vite";
import {coverageConfigDefaults, defaultExclude} from "vitest/config";
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
        exclude: [...defaultExclude, "build/**", ".yalc/**"],
        fileParallelism: false,
        restoreMocks: true,
        globalSetup: ["./test/globalSetup.ts",],
        coverage: {
            enabled: true,
            reporter: ["text", "html"],
            exclude: ["test-results/**", "src/migrations/**", ...coverageConfigDefaults.exclude]
        },
        projects: [
            {
                extends: true,
                test: {
                    name: "unit",
                    testTimeout: 0,
                    include: ["test/unit/**/*.test.ts"],
                    setupFiles: ["./test/unit/unitTestSetup.ts"],
                },
            },
            {

                extends: true,
                test: {
                    name: "integration",
                    testTimeout: 10_000,
                    include: ["test/integration/**/*.test.ts"],
                    setupFiles: ["./test/integration/integrationTestSetup.ts"],
                },
            },
        ],
    },
});
