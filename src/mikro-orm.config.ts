import * as dotenv from "dotenv";
dotenv.config();
import {LoadStrategy, Options} from "@mikro-orm/core";

const devOptions: Options = {
    type: "postgresql",
    dbName: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
    entities: ["./build/src/models/entities"],
    entitiesTs: ["./src/models/entities"],
    loadStrategy: LoadStrategy.JOINED,
    debug: true,
    migrations: {
        path: "build/src/migrations",
        pathTs: "src/migrations",
    },
};

const testOptions: Options = {
    ...devOptions,
    dbName: `${devOptions.dbName}-test`,
    debug: true,
};

const prodOptions: Options = {
    ...devOptions,
    debug: false,
};

let options: Options;
if (process.env.ENVIRONMENT == "test")
    options = testOptions;
else if (process.env.ENVIRONMENT == "prod")
    options = prodOptions;
else
    options = devOptions;

export default options;