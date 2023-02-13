import {VocabSchema} from "@/src/schemas/response/interfaces/VocabSchema.js";

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