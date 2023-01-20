import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {LessonFactory} from "@/src/seeders/factories/LessonFactory.js";
import {Lesson} from "@/src/models/entities/Lesson.js";

export class LessonSeeder extends Seeder {
    static readonly FILE_NAME = "lessons.json";

    async run(em: EntityManager, context: Dictionary): Promise<void> {
        if (!await fs.exists(`data/${LessonSeeder.FILE_NAME}`))
            return;
        const lessons = await fs.readJSON(`data/${LessonSeeder.FILE_NAME}`)
        const lessonsFactory = new LessonFactory(em)

        process.stdout.write("seeding lessons...");
        lessons.forEach((lessonData: EntityData<Lesson>) => {
            em.persist(lessonsFactory.makeEntity({
                id: lessonData.id,
                title: lessonData.title,
                text: lessonData.text,
                course: lessonData.course,
                orderInCourse: lessonData.orderInCourse,
                addedOn: lessonData.addedOn,
                audio: lessonData.audio,
                image: lessonData.image,
                learners: lessonData.learners
            }))
        })
        await em.flush();
        console.log("done");
    }
}