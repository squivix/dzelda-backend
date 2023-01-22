import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {CourseListSchema} from "@/src/schemas/response/interfaces/CourseListSchema.js";

export interface LessonListSchema {
    id: number;
    title: string;
    /** Format: uri */
    image: string;
    course: CourseListSchema;
    orderInCourse: number;
    /** Format: date-time */
    addedOn: string;
    vocabsByLevel?: Record<VocabLevel, number>

}