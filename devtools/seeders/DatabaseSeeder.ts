import {readdirSync} from "fs";
import prompts from "prompts";
import {EntityManager, MikroORM} from "@mikro-orm/postgresql";
import {DATA_DIR, DEFAULT_BATCH_SIZE} from "@/devtools/constants.js";
import path from "path";
import {batchSeed, bringForthArrayElements} from "@/devtools/seeders/utils.js";
import options from "@/src/mikro-orm.config.js";

const orm = await MikroORM.init({...options, debug: false});
await seedDatabase();
await orm.close();


async function seedDatabase() {
    console.log("Seeding");

    const datasets = readdirSync(DATA_DIR, {withFileTypes: true})
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    if (datasets.length == 0) {
        console.error("No datasets found.");
        return;
    }
    const response = await prompts([
        {
            type: "select",
            instructions: false,
            name: "dataset",
            message: "Pick dataset",
            choices: datasets.map(dataset => ({title: dataset, value: path.join(DATA_DIR, dataset)})),
        },
        {
            type: "number",
            name: "batchSize",
            message: `Enter batch size? (default=${DEFAULT_BATCH_SIZE})`,
            validate: value => value !== "" && Number(value) < 1 ? `Batch size must be positive` : true
        }
    ]);

    if (response.dataset == undefined || response.batchSize == undefined)
        throw new Error("Keyboard Interrupt");

    const databaseDumpPath = path.join(response.dataset, "database");
    const batchSize: number = response.batchSize || DEFAULT_BATCH_SIZE;
    const em = orm.em.fork() as EntityManager;
    const tableNames = Object.values(em.getMetadata().getAll()).map(m => m.tableName);
    await em.begin();
    const reorderedTableNames = bringForthArrayElements(tableNames, ["language", "user", "profile", "collection", "attribution_source","dictionary","translation_language","map_learner_language"]);
    for (const tableName of reorderedTableNames) {
        await batchSeed({
            em,
            tableName: tableName,
            filePath: path.join(databaseDumpPath, `${tableName}.jsonl`),
            batchSize: batchSize,
        });
    }
    await em.commit();
}

