import {LanguageSchema} from "@/src/presentation/response/interfaces/entities/LanguageSchema.js";

export interface DictionarySchema {
    id: number;
    name: string;
    link: string;
    language: string;
}