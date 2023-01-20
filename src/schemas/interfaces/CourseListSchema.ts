import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";
import {VocabsByLevelCount} from "@/src/schemas/interfaces/VocabsByLevelCount.js";

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
    vocabsByLevel: VocabsByLevelCount
}