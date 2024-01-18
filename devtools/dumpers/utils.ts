import {EntityData, EntityManager, EntityName} from "@mikro-orm/core";
import fs from "fs-extra";
import * as cliProgress from "cli-progress";
import {EntityClass} from "@mikro-orm/core/typings.js";

export async function batchDump<T>({em, resourceName, entityClass, filePath, batchSize, postDump, writeEntity}: {
    em: EntityManager,
    resourceName: string,
    entityClass: EntityClass<any>,
    filePath: string,
    batchSize: number,
    writeEntity: (entity: T) => EntityData<T>
    postDump?: () => Promise<void>
}): Promise<void> {
    await fs.ensureFile(filePath)
    const entitiesCount = await em.count(entityClass, {});
    console.log(`seeding ${entitiesCount.toLocaleString("en")} ${resourceName}(s)...`);
    const loadingBar = new cliProgress.SingleBar({
        format: " {bar} {percentage}% | {duration_formatted} | ETA: {eta}s | {value}/{total}",
    }, cliProgress.Presets.shades_classic);
    const fileOutputStream = fs.createWriteStream(filePath);
    let insertedCount = 0;
    loadingBar.start(entitiesCount, 0);
    while (insertedCount < entitiesCount) {
        const batch = await em.find(entityClass, {}, {limit: batchSize, offset: insertedCount});
        batch.forEach(e => fileOutputStream.write(`${JSON.stringify(writeEntity(e))}\n`))
        insertedCount += batch.length;
        loadingBar.increment(batch.length);
    }
    fileOutputStream.close();
    if (postDump)
        await postDump();
    loadingBar.stop();
}