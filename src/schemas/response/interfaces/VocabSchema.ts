import {MeaningSchema} from "@/src/schemas/response/interfaces/MeaningSchema.js";

export interface VocabOnlySchema {
    id: number;
    text: string;
    isPhrase: boolean;
    language: string;
    meanings: Partial<MeaningSchema>[];
}

export interface MapLearnerVocabSchema {
    id: number;
    text: string;
    isPhrase: boolean;
    level?: number;
    notes?: string;
    language: string;
    allMeanings: Partial<MeaningSchema>[];
    userMeanings?: Partial<MeaningSchema>[];
}


export type VocabSchema = VocabOnlySchema | MapLearnerVocabSchema