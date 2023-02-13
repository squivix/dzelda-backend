import {LanguageSchema} from "@/src/schemas/response/interfaces/LanguageSchema.js";
import {ProfileSchema} from "@/src/schemas/response/interfaces/ProfileSchema.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {LessonSchema} from "@/src/schemas/response/interfaces/LessonSchema.js";

export interface CourseSchema {
    id: number;
    title: string;
    description: string;
    /** Format: uri */
    image: string;
    isPublic: boolean;
    /** @enum {string} */
    level: LanguageLevel;
    language: string;
    addedBy: string;
    lessons?: Partial<LessonSchema>[];
    vocabsByLevel?: Record<VocabLevel, number>;
}