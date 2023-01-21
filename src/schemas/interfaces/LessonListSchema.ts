import {VocabLevel} from "@/src/models/enums/VocabLevel.js";

export interface LessonListSchema {
    vocabsByLevel: Record<VocabLevel, number>

}