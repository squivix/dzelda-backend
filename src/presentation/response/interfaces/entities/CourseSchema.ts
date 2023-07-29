import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {LessonSchema} from "@/src/presentation/response/interfaces/entities/LessonSchema.js";

export interface CourseSchema {
    id: number;
    title: string;
    description: string;
    /** Format: uri */
    image: string;
    isPublic: boolean;
    language: string;
    /** Format: date-time */
    addedOn: string;
    addedBy: string;
    lessons?: Partial<LessonSchema>[];
    vocabsByLevel?: Record<VocabLevel, number>;
}
