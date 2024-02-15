import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {batchSeed, syncIdSequence} from "@/devtools/seeders/utils.js";
import {MapLessonVocab} from "@/src/models/entities/MapLessonVocab.js";
import path from "path";
import {DATASET_FILES} from "@/devtools/constants.js";

export class LessonSeeder extends Seeder {
    async run(em: EntityManager, context: Dictionary): Promise<void> {
        const lessonsFilePath = path.join(context.databaseDumpPath, DATASET_FILES.lesson);
        const mapLessonVocabsFilePath = path.join(context.databaseDumpPath, DATASET_FILES.mapLessonVocab);

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
    }


    private async insertLessonsBatch(em: EntityManager, batch: EntityData<Lesson>[]) {
        await em.insertMany(Lesson, batch.map(lessonData => ({
            id: lessonData.id,
            title: lessonData.title,
            text: lessonData.text,
            parsedTitle: lessonData.parsedTitle,
            parsedText: lessonData.parsedText,
            collection: lessonData.collection,
            isPublic: lessonData.isPublic,
            level: lessonData.level,
            addedBy: lessonData.addedBy,
            language: lessonData.language,
            orderInCollection: lessonData.orderInCollection,
            addedOn: lessonData.addedOn,
            audio: lessonData.audio,
            image: lessonData.image,
        })));
    }

    private async insertMapLessonVocabsBatch(em: EntityManager, batch: EntityData<MapLessonVocab>[]) {
        await em.insertMany(MapLessonVocab, batch.map((mappingData) => ({
            lesson: mappingData.lesson,
            vocab: mappingData.vocab,
        })));
    }
}
