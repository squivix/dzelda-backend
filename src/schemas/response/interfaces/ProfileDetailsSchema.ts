import {LanguageListSchema} from "@/src/schemas/response/interfaces/LanguageListSchema.js";

export interface ProfileDetailsSchema {
    id: number;
    languagesLearning: LanguageListSchema[];
    /** Format: uri */
    profilePicture: string;
    bio: string;
    isPublic: boolean;
}