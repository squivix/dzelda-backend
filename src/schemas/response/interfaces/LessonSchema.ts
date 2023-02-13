import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {CourseSchema} from "@/src/schemas/response/interfaces/CourseSchema.js";

export interface LessonSchema {
    id: number;
    title: string;
    text: string;
    /** Format: uri */
    audio: string;
    /** Format: uri */
    image: string;
    course: Partial<CourseSchema>;
    orderInCourse: number;
    /** Format: date-time */
    addedOn: string;
    vocabsByLevel?: Record<VocabLevel, number>;

}