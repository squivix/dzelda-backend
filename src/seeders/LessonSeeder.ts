import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {LessonFactory} from "@/src/seeders/factories/LessonFactory.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {batchSeed, syncIdSequence} from "@/src/seeders/utils.js";
import {MapLessonVocab} from "@/src/models/entities/MapLessonVocab.js";

export class LessonSeeder extends Seeder {
    static readonly LESSONS_FILE_NAME = "lessons.jsonl";
    static readonly MAP_LESSON_VOCABS_FILE_NAME = "map_lesson_vocabs.jsonl";


    async run(em: EntityManager, context: Dictionary): Promise<void> {
        const lessonsFilePath = `${context.datasetPath}/${LessonSeeder.LESSONS_FILE_NAME}`;
        const mapLessonVocabsFilePath = `${context.datasetPath}/${LessonSeeder.MAP_LESSON_VOCABS_FILE_NAME}`;

        if (!await fs.exists(lessonsFilePath)) {
            console.error(`${lessonsFilePath} not found`);
            return;
        }

        await batchSeed({
            filePath: lessonsFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertLessonsBatch(em, batch),
            postSeed: async () => await syncIdSequence(em, "lesson"),
            resourceName: "lesson",
        });


        await batchSeed({
            filePath: mapLessonVocabsFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertMapLessonVocabsBatch(em, batch),
            resourceName: "lesson-vocab mappings",
        });

        await em.flush();
        console.log("done");
    }


    private async insertLessonsBatch(em: EntityManager, batch: EntityData<Lesson>[]) {
        const lessonFactory = new LessonFactory(em);

        const entities = batch.map(lessonData => lessonFactory.makeEntity({
            id: lessonData.id,
            title: lessonData.title,
            text: lessonData.text,
            course: lessonData.course,
            orderInCourse: lessonData.orderInCourse,
            addedOn: lessonData.addedOn,
            audio: lessonData.audio,
            image: lessonData.image,
            learners: lessonData.learners
        }));
        await em.persistAndFlush(entities);
    }

    private async insertMapLessonVocabsBatch(em: EntityManager, batch: EntityData<MapLessonVocab>[]) {
        await em.insertMany(MapLessonVocab, batch.map((mappingData) => ({
            lesson: mappingData.lesson,
            vocab: mappingData.vocab,
        })));
    }
}
