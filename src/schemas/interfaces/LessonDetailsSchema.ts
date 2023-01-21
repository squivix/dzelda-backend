import {VocabLevel} from "@/src/models/enums/VocabLevel.js";

export interface LessonDetailsSchema {
    vocabsByLevel: Record<VocabLevel, number>

}