import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import fs from "fs-extra";
import {Course} from "@/src/models/entities/Course.js";
import {CourseFactory} from "@/src/seeders/factories/CourseFactory.js";
import {batchSeed, syncIdSequence} from "@/src/seeders/utils.js";
import {Seeder} from "@mikro-orm/seeder";

export class CourseSeeder extends Seeder {
    static readonly FILE_NAME = "courses.jsonl";

    async run(em: EntityManager, context: Dictionary): Promise<void> {
        const coursesFilePath = `${context.datasetPath}/${CourseSeeder.FILE_NAME}`;

        if (!await fs.exists(coursesFilePath)) {
            console.log(`${coursesFilePath} not found`);
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
        const courseFactory = new CourseFactory(em);
        const entities = batch.map(courseData => courseFactory.makeEntity({
            id: courseData.id,
            title: courseData.title,
            isPublic: courseData.isPublic,
            description: courseData.description,
            language: courseData.language,
            addedBy: courseData.addedBy,
            image: courseData.image,
            lessons: []
        }));
        await em.persistAndFlush(entities);
    }
}
