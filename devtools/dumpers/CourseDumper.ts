import {DATASET_FILES} from "@/devtools/constants.js";
import {EntityManager} from "@mikro-orm/core";
import {Course} from "@/src/models/entities/Course.js";
import {batchDump} from "@/devtools/dumpers/utils.js";
import path from "path";

export async function dumpCourses({em, batchSize, dataPath}: { em: EntityManager, batchSize: number, dataPath: string }) {
    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_FILES.course),
        entityClass: Course,
        resourceName: "course",
        writeEntity: (course: Course) => ({
            id: course.id,
            title: course.title,
            description: course.description,
            language: course.language.id,
            addedBy: course.addedBy.id,
            image: course.image
        })
    })
}
