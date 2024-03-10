import {EntityManager} from "@mikro-orm/postgresql";
import fs from "fs-extra";
import * as cliProgress from "cli-progress";

export async function batchDump<T>({em, tableName, filePath, batchSize, postDump}: {
    em: EntityManager,
    tableName: string,
    filePath: string,
    batchSize: number,
    postDump?: () => Promise<void>
}): Promise<void> {
    await fs.ensureFile(filePath);
    const entitiesCount = await em.createQueryBuilder(tableName).count();
    console.log(`dumping ${entitiesCount.toLocaleString("en")} row(s) from ${tableName}...`);
    const loadingBar = new cliProgress.SingleBar({
        format: " {bar} {percentage}% | {duration_formatted} | ETA: {eta}s | {value}/{total}",
    }, cliProgress.Presets.shades_classic);
    const fileOutputStream = fs.createWriteStream(filePath);
    let insertedCount = 0;
    loadingBar.start(entitiesCount, 0);

    const table = `${em.schema ?? "public"}.${tableName}`;
    while (insertedCount < entitiesCount) {
        const batch = await em.execute(`select * from ${table} order by id limit ${batchSize} offset ${insertedCount}`);
        batch.forEach((e: Record<string, any>) => fileOutputStream.write(`${JSON.stringify(e)}\n`));
        insertedCount += batch.length;
        loadingBar.increment(batch.length);
    }
    fileOutputStream.close();
    if (postDump)
        await postDump();
    loadingBar.stop();
}
