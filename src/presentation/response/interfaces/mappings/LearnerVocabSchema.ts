import {MeaningSchema} from "@/src/presentation/response/interfaces/entities/MeaningSchema.js";

export interface LearnerVocabSchema {
    id: number;
    text: string;
    isPhrase: boolean;
    level: number;
    notes: string | null;
    language: string;
    allMeanings: Partial<MeaningSchema>[];
    userMeanings: Partial<MeaningSchema>[];
}
