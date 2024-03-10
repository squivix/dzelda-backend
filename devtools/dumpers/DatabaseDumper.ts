import {readdirSync} from "fs";
import prompts from "prompts";
import fs from "fs-extra";
import {DATA_DIR, DEFAULT_BATCH_SIZE} from "@/devtools/constants.js";
import {EntityManager, MikroORM} from "@mikro-orm/postgresql";
import options from "@/src/mikro-orm.config.js";
import path from "path";
import {batchDump} from "@/devtools/dumpers/utils.js";


const orm = await MikroORM.init({...options, debug: false});
await dumpDatabase();
await orm.close();


async function dumpDatabase() {
    console.log("Dumping");

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
            choices: [{title: "New dataset", value: null},
                ...datasets.map(dataset => ({title: dataset, value: path.join(DATA_DIR, dataset)}))
            ],
        },
    ]);

    if (response.dataset === undefined)
        throw new Error("Keyboard Interrupt");
    let datasetPath: string;
    if (response.dataset === null) {
        //new dataset
        const datasetName = (await prompts([{
            type: "text",
            name: "name",
            message: `Enter new dataset name: `
        }])).name;
        if (datasets.includes(datasetName)) {
            console.error(`dataset ${datasetName} already exists`);
            return;
        }
        datasetPath = path.join(DATA_DIR, datasetName);
        await fs.ensureDir(datasetPath);
    } else {
        const confirmAnswer = await prompts([{
            type: "confirm",
            name: "isSure",
            message: `Are you sure you want to do this? The directory ${response.dataset} will be wiped!`
        }]);
        if (!confirmAnswer.isSure) {
            console.log("Aborting.");
            return;
        }
        datasetPath = response.dataset;
    }
    const batchSize = (await prompts([
        {
            type: "number",
            name: "batchSize",
            message: `Enter batch size? (default=${DEFAULT_BATCH_SIZE})`,
            validate: value => value !== "" && Number(value) < 1 ? `Batch size must be positive` : true
        }
    ])).batchSize || DEFAULT_BATCH_SIZE;
    const dataPath = path.join(datasetPath, "database");
    await fs.remove(dataPath);
    await fs.ensureDir(dataPath);
    console.log(`Writing db data to to ${datasetPath}...`);
    const em = orm.em.fork() as EntityManager;
    const tableNames = Object.values(em.getMetadata().getAll()).map(m => m.tableName);
    for (const tableName of tableNames) {
        await batchDump({
            em, batchSize,
            tableName,
            filePath: path.join(dataPath, `${tableName}.jsonl`),
        });
    }

}
