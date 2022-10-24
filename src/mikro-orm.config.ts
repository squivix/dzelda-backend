import {LoadStrategy, Options} from "@mikro-orm/core";

const options: Options = {
    type: "postgresql",
    port: 5432,
    user: "devin",
    entities: ["./build/models/entities"],
    entitiesTs: ["./src/models/entities"],
    dbName: "dzelda-db",
    debug: true,
    loadStrategy: LoadStrategy.JOINED,
    migrations: {
        path: "build/migrations",
        pathTs: "src/migrations",
    },
};

export default options;