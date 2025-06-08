import {orm} from "@/src/server.js";
import process from "process";

export async function setup() {
    if (process.env.NODE_ENV !== "test") {
        console.log(`NODE_ENV is incorrectly set to ${process.env.NODE_ENV}`);
        process.exit(1);
    } else
        console.log(`NODE_ENV is correctly set to ${process.env.NODE_ENV}`);

    await orm.getSchemaGenerator().clearDatabase();
}
