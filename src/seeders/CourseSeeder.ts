import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {Course} from "@/src/models/entities/Course.js";
import {CourseFactory} from "@/src/seeders/factories/CourseFactory.js";

export class CourseSeeder extends Seeder {
    static readonly FILE_NAME = "courses.json";

    async run(em: EntityManager, context: Dictionary): Promise<void> {
        if (!await fs.exists(`data/${CourseSeeder.FILE_NAME}`))
            return;
        const courses = await fs.readJSON(`data/${CourseSeeder.FILE_NAME}`)
        const courseFactory = new CourseFactory(em)

        process.stdout.write("seeding courses...");
        courses.forEach((courseData: EntityData<Course>) => {
            em.persist(courseFactory.makeEntity({
                id: courseData.id,
                title: courseData.title,
                isPublic: courseData.isPublic,
                description: courseData.description,
                language: courseData.language,
                addedBy: courseData.addedBy,
                image: courseData.image,
                lessons: []
            }))
        })
        await em.flush();
        console.log("done");
    }
}