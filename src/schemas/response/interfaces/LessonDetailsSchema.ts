import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {CourseDetailsSchema} from "@/src/schemas/response/interfaces/CourseDetailsSchema.js";

export interface LessonDetailsSchema {
    id: number;
    title: string;
    text: string;
    /** Format: uri */
    audio: string;
    /** Format: uri */
    image: string;
    course: CourseDetailsSchema;
    orderInCourse: number;
    /** Format: date-time */
    addedOn: string;
    vocabsByLevel?: Record<VocabLevel, number>

}