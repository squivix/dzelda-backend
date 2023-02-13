import {LanguageSchema} from "@/src/schemas/response/interfaces/LanguageSchema.js";

export interface ProfileSchema {
    id: number;
    languagesLearning: Partial<LanguageSchema>[];
    /** Format: uri */
    profilePicture: string;
    bio: string;
    isPublic: boolean;
}