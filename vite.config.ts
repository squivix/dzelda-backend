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
        globalSetup: ["./test/globalSetup.ts",],
        setupFiles: [
            "./test/setup.ts"
        ],
        restoreMocks: true,
        testTimeout: 10_000,
        coverage: {
            enabled: true,
            reporter: ["text", 'html'],
            exclude: ['test-results/**', 'src/migrations/**', ...coverageConfigDefaults.exclude]
        }
    },
});
