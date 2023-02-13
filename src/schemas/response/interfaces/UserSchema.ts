import {ProfileSchema} from "@/src/schemas/response/interfaces/ProfileSchema.js";

export interface UserSchema {
    username: string;
    /** Format: email */
    email?: string;
    profile: Partial<ProfileSchema>;
}