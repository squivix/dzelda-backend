import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import fs from "fs-extra";
import {Course} from "@/src/models/entities/Course.js";
import {batchSeed, syncIdSequence} from "@/devtools/seeders/utils.js";
import {Seeder} from "@mikro-orm/seeder";
import {DATASET_COURSE_FILE_NAME} from "@/devtools/constants.js";
import path from "path";

export class CourseSeeder extends Seeder {

    async run(em: EntityManager, context: Dictionary): Promise<void> {
        const coursesFilePath = path.join(context.databaseDumpPath, DATASET_COURSE_FILE_NAME);

        if (!await fs.exists(coursesFilePath)) {
            console.error(`${coursesFilePath} not found`);
            return;
        }

        await batchSeed({
            filePath: coursesFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertBatch(em, batch),
            postSeed: async () => await syncIdSequence(em, "course"),
            resourceName: "course",
        });
    }

    private async insertBatch(em: EntityManager, batch: EntityData<Course>[]) {
        await em.insertMany(Course, batch.map(courseData => ({
            id: courseData.id,
            title: courseData.title,
            description: courseData.description,
            language: courseData.language,
            addedBy: courseData.addedBy,
            image: courseData.image,
        })));
    }
}
