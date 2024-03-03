import {orm} from "@/src/server.js";

export async function setup() {
    await orm.getSchemaGenerator().clearDatabase();
}
