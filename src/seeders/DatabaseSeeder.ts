import {readdirSync} from "fs";
import prompts from "prompts";
import {Seeder} from "@mikro-orm/seeder";
import {EntityManager} from "@mikro-orm/core";
import {UserSeeder} from "@/src/seeders/UserSeeder.js";
import {LanguageSeeder} from "@/src/seeders/LanguageSeeder.js";
import {CourseSeeder} from "@/src/seeders/CourseSeeder.js";
import {LessonSeeder} from "@/src/seeders/LessonSeeder.js";
import {VocabSeeder} from "@/src/seeders/VocabSeeder.js";
import {MeaningSeeder} from "@/src/seeders/MeaningSeeder.js";
import {DictionarySeeder} from "@/src/seeders/DictionarySeeder.js";


export class DatabaseSeeder extends Seeder {
    static readonly DATA_DIR = "data";
    static readonly DEFAULT_BATCH_SIZE = 10000;

    async run(em: EntityManager): Promise<void> {
        console.log("Seeding");

        const datasets = readdirSync(DatabaseSeeder.DATA_DIR, {withFileTypes: true})
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        if (datasets.length == 0) {
            console.log("No datasets found.");
            return;
        }
        const questions=[];
        const response = await prompts([
            {
                type: "select",
                instructions: false,
                name: "dataset",
                message: "Pick dataset",
                choices: datasets.map(dataset => ({title: dataset, value: `${DatabaseSeeder.DATA_DIR}/${dataset}`})),
            },
            {
                type: "number",
                name: "batchSize",
                message: `Enter batch size? (default=${DatabaseSeeder.DEFAULT_BATCH_SIZE})`,
                validate: value => value !== "" && Number(value) < 1 ? `Batch size must be positive` : true
            }
        ]);

        if (response.dataset == undefined || response.batchSize == undefined)
            throw new Error("Keyboard Interrupt");


        return this.call(em, [          //order is important
                LanguageSeeder,
                UserSeeder,
                DictionarySeeder,
                CourseSeeder,
                VocabSeeder,
                LessonSeeder,
                MeaningSeeder,
            ],
            {
                datasetPath: response.dataset,
                batchSize: response.batchSize || DatabaseSeeder.DEFAULT_BATCH_SIZE
            });
    }
}
