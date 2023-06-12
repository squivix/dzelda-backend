import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {CourseSchema} from "@/src/presentation/response/interfaces/entities/CourseSchema.js";

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