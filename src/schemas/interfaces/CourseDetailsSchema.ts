import {LanguageDetailsSchema} from "@/src/schemas/interfaces/LanguageDetailsSchema.js";
import {ProfileDetailsSchema} from "@/src/schemas/interfaces/ProfileDetailsSchema.js";
import {LessonListSchema} from "@/src/schemas/interfaces/LessonListSchema.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";

export interface CourseDetailsSchema {
    id: number;
    title: string;
    description: string;
    /** Format: uri */
    image: string;
    isPublic: boolean;
    /** @enum {string} */
    level: LanguageLevel;
    language: LanguageDetailsSchema;
    addedBy: ProfileDetailsSchema;
    lessons: LessonListSchema[];
    vocabsByLevel: Record<VocabLevel, number>
}