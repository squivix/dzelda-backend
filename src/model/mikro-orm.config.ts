import {LoadStrategy, Options} from '@mikro-orm/core';

const options: Options = {
    type: 'postgresql',
    port: 5432,
    user: "devin",
    entities: ["./entities/*.ts"],
    dbName: 'dzelda-db',
    debug: true,
    forceUtcTimezone: true,
    loadStrategy: LoadStrategy.JOINED,
};

export default options;