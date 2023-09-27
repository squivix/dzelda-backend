import {Dictionary, EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";

export class FileUploadsSeeder extends Seeder {
    static readonly UPLOADS_PATH = "public/uploads";

    async run(_: EntityManager, context: Dictionary): Promise<void> {
        process.stdout.write("copying uploads...");
        await fs.remove(FileUploadsSeeder.UPLOADS_PATH);
        await fs.copy(context.uploadsDumpPath, FileUploadsSeeder.UPLOADS_PATH);
        console.log(`done`);
    }
}

