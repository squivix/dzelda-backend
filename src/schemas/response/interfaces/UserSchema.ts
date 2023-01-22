import {ProfileDetailsSchema} from "@/src/schemas/response/interfaces/ProfileDetailsSchema.js";

export interface UserSchema {
    username: string;
    /** Format: email */
    email?: string;
    profile: ProfileDetailsSchema;
}