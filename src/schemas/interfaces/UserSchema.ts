import {ProfileDetailsSchema} from "@/src/schemas/interfaces/ProfileDetailsSchema.js";

export interface UserSchema {
    username: string;
    /** Format: email */
    email?: string;
    profile: ProfileDetailsSchema;
}