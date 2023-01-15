import {LanguageListSchema} from "@/src/schemas/interfaces/LanguageListSchema.js";

export interface ProfileDetailsSchema {
    id: number;
    languagesLearning: LanguageListSchema[];
    /** Format: uri */
    profilePicture: string;
    bio: string;
    isPublic: boolean;
}