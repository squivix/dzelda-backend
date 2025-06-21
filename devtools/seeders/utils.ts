import {EntityData, EntityManager} from "@mikro-orm/postgresql";
import fs from "fs-extra";
import {countFileLines} from "@/src/utils/utils.js";
import * as cliProgress from "cli-progress";
import {open} from "node:fs/promises";

export async function batchSeed<T>({em, tableName, filePath, batchSize}: {
    em: EntityManager,
    tableName: string,
    filePath: string,
    batchSize: number,
}): Promise<void> {
    if (!fs.existsSync(filePath)) {
        console.log(`${filePath} not found`);
        return;
    }

    const linesCount = await countFileLines(filePath);
    if (linesCount === 0)
        return;
    console.log(`seeding ${linesCount.toLocaleString("en")} row(s) to ${tableName}...`);
    const loadingBar = new cliProgress.SingleBar({
        format: " {bar} {percentage}% | {duration_formatted} | ETA: {eta}s | {value}/{total}",
    }, cliProgress.Presets.shades_classic);
    const fileHandle = await open(filePath);
    let batch: EntityData<T>[] = [];
    loadingBar.start(linesCount, 0);

    for await (const line of fileHandle.readLines()) {
        if (batch.length >= batchSize) {
            await em.insertMany(tableName, batch, {ctx: em.getTransactionContext()});
            loadingBar.increment(batch.length);
            batch = [];
        }
        const rowObject = JSON.parse(line);
        batch.push(rowObject);
    }
    //last batch
    await em.createQueryBuilder(tableName).insert(batch).execute();
    loadingBar.increment(batch.length);
    await syncIdSequence(em, tableName);
    loadingBar.stop();
}

export async function syncIdSequence(em: EntityManager, tableName: string) {
    await em.execute(`SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), coalesce(max(id),0) + 1, false) FROM "${tableName}"`);
}

export function bringForthArrayElements<T extends string | number | symbol>(originalArray: T[], subArray: T[]): T[] {
    const originalArraySet = new Set(originalArray);
    const subArraySet = new Set(subArray);
    const newArray = subArray.filter(e => originalArraySet.has(e));
    for (const item of originalArray) {
        if (!subArraySet.has(item))
            newArray.push(item);
    }
    return newArray;
}
