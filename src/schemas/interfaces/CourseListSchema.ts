import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";

export interface CourseListSchema {
    id: number;
    title: string;
    description: string;
    /** Format: uri */
    image: string;
    isPublic: boolean;
    /** @enum {string} */
    level: LanguageLevel;
    language: number;
    addedBy: string;
    vocabsByLevel?: Record<VocabLevel, number>
}