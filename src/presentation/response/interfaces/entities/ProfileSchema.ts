import {LanguageSchema} from "@/src/presentation/response/interfaces/entities/LanguageSchema.js";


export interface ProfileSchema {
    id: number;
    languagesLearning: Partial<LanguageSchema>[];
    /** Format: uri */
    profilePicture: string;
    bio: string;
    isPublic: boolean;
}