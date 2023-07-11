import {MeaningSchema} from "@/src/presentation/response/interfaces/entities/MeaningSchema.js";

export interface VocabSchema {
    id: number;
    text: string;
    isPhrase: boolean;
    language: string;
    meanings: Partial<MeaningSchema>[];
    learnersCount: number;
    lessonsCount: number;
}
