import {readdirSync} from "fs";
import prompts from "prompts";
import {Seeder} from "@mikro-orm/seeder";
import {EntityManager} from "@mikro-orm/core";
import {UserSeeder} from "@/devtools/seeders/UserSeeder.js";
import {LanguageSeeder} from "@/devtools/seeders/LanguageSeeder.js";
import {CollectionSeeder} from "@/devtools/seeders/CollectionSeeder.js";
import {TextSeeder} from "@/devtools/seeders/TextSeeder.js";
import {VocabSeeder} from "@/devtools/seeders/VocabSeeder.js";
import {MeaningSeeder} from "@/devtools/seeders/MeaningSeeder.js";
import {DictionarySeeder} from "@/devtools/seeders/DictionarySeeder.js";
import {FileUploadsSeeder} from "@/devtools/seeders/FileUploadsSeeder.js";
import {DATA_DIR, DEFAULT_BATCH_SIZE} from "@/devtools/constants.js";
import path from "path";


export class DatabaseSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
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


        return this.call(em, [          //order is important
                LanguageSeeder,
                UserSeeder,
                DictionarySeeder,
                CollectionSeeder,
                VocabSeeder,
                TextSeeder,
                MeaningSeeder,
                FileUploadsSeeder   //not db-related but still
            ],
            {
                datasetPath: response.dataset,
                databaseDumpPath: `${response.dataset}/database`,
                uploadsDumpPath: `${response.dataset}/uploads`,
                batchSize: response.batchSize || DEFAULT_BATCH_SIZE
            });
    }
}

