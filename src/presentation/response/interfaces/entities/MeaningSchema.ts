import {VocabSchema} from "@/src/presentation/response/interfaces/entities/VocabSchema.js";


export interface MeaningSchema {
    id: number;
    text: string;
    vocab?: Partial<VocabSchema>;
    learnersCount: number;
    addedBy: string;
    language: string;
    /** Format: date-time */
    addedOn: string;
}