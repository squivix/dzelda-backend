import {EntityData, EntityManager} from "@mikro-orm/core";
import {SqlEntityManager} from "@mikro-orm/postgresql";
import fs from "fs-extra";
import {countFileLines} from "@/src/utils/utils.js";
import * as cliProgress from "cli-progress";
import {open} from "node:fs/promises";

export async function batchSeed<T>({filePath, batchSize, resourceName, postSeed, insertBatch}: {
    filePath: string,
    batchSize: number,
    resourceName: string,
    insertBatch: (batch: EntityData<T>[]) => Promise<void>
    postSeed?: () => Promise<void>
}): Promise<void> {
    if (!await fs.exists(filePath)) {
        console.log(`${filePath} not found`);
        return;
    }

    const linesCount = await countFileLines(filePath);
    console.log(`seeding ${linesCount.toLocaleString("en")} ${resourceName}(s)...`);
    const loadingBar = new cliProgress.SingleBar({
        format: " {bar} {percentage}% | {duration_formatted} | ETA: {eta}s | {value}/{total}",
    }, cliProgress.Presets.shades_classic);
    const fileHandle = await open(filePath);
    let batch: EntityData<T>[] = [];
    loadingBar.start(linesCount, 0);
    for await (const line of fileHandle.readLines()) {
        if (batch.length >= batchSize) {
            await insertBatch(batch);
            loadingBar.increment(batch.length);
            batch = [];
        }
        batch.push(JSON.parse(line));
    }
    //last batch
    await insertBatch(batch);
    loadingBar.increment(batch.length);

    if (postSeed)
        await postSeed();
    loadingBar.stop();
}

export async function syncIdSequence(em: EntityManager, tableName: string) {
    await (em as SqlEntityManager).execute(`SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), coalesce(max(id),0) + 1, false) FROM "${tableName}"`);
}

