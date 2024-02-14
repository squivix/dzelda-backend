import {orm} from "@/src/server.js";

export async function globalSetup() {
    await orm.getSchemaGenerator().clearDatabase();
}

