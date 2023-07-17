import {orm} from "@/src/server.js";
import fs, {mkdir, rm} from "fs-extra";
import {TEMP_ROOT_DIR} from "@/tests/testConstants.js";

export async function setup() {
    await orm.getSchemaGenerator().clearDatabase();
}

export async function teardown() {
    await fs.emptyDir(TEMP_ROOT_DIR)
}
