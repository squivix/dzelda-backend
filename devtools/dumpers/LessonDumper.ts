import {EntityManager} from "@mikro-orm/core";
import {batchDump} from "@/devtools/dumpers/utils.js";
import path from "path";
import {DATASET_LESSON_FILE_NAME, DATASET_MAP_LESSON_VOCABS__FILE_NAME} from "@/devtools/constants.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {MapLessonVocab} from "@/src/models/entities/MapLessonVocab.js";

export async function dumpLessons({em, batchSize, dataPath}: { em: EntityManager, batchSize: number, dataPath: string }) {
    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_LESSON_FILE_NAME),
        entityClass: Lesson,
        resourceName: "lesson",
        writeEntity: (lesson: Lesson) => ({
            id: lesson.id,
            title: lesson.title,
            text: lesson.text,
            parsedTitle: lesson.parsedTitle,
            parsedText: lesson.parsedText,
            course: lesson.course.id,
            orderInCourse: lesson.orderInCourse,
            addedOn: lesson.addedOn,
            audio: lesson.audio,
            image: lesson.image,
        })
    })

    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_MAP_LESSON_VOCABS__FILE_NAME),
        entityClass: MapLessonVocab,
        resourceName: "lesson-vocab mappings",
        writeEntity: (mapping: MapLessonVocab) => ({
            lesson: mapping.lesson.id,
            vocab: mapping.vocab.id
        })
    })
}
