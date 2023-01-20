import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {LessonFactory} from "@/src/seeders/factories/LessonFactory.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {parsers} from "@/src/utils/parsers/parsers.js";
import {Language} from "@/src/models/entities/Language.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {syncIdSequence} from "@/src/seeders/utils.js";
import {MapLessonVocab} from "@/src/models/entities/MapLessonVocab.js";

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
        await syncIdSequence(em, "lesson")

        await Promise.all(lessons.map(async (lessonData: EntityData<Lesson>) => {
            const language = await em.findOneOrFail(Language, {courses: {lessons: lessonData.id}});
            const lessonWords = parsers[language.code].parseText(lessonData.text!!);

            await em.upsertMany(Vocab, lessonWords.map(word => ({text: word, language: language.id})));
            const lessonVocabs = await em.find(Vocab, {text: lessonWords, language: language.id})

            await em.insertMany(MapLessonVocab, lessonVocabs.map(vocab => ({lesson: lessonData.id, vocab: vocab.id})));
        }))
        await em.flush();
        console.log("done");
    }
}