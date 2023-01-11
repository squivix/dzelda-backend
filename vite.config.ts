/// <reference types="vitest" />

// Configure Vitest (https://vitest.dev/config/)

import {defineConfig} from "vite";
import {defaultExclude} from "vitest/config";
import path from "path";
import vavite from "vavite";

export default defineConfig({
    plugins:[
        vavite({
            serverEntry: "/src/server.ts",
            reloadOn: "static-deps-change",
            serveClientAssetsInDev: true,
        }),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "."),
        },
    },
    server: {
        hmr: false      //debugging line numbers wrong with hmr :(
    },
    test: {
        /* for example, use global to avoid globals imports (describe, test, expect): */
        exclude: [...defaultExclude, "build/**"],
        threads: false
    },
});