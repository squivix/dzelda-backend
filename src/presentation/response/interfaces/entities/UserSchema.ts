import {ProfileSchema} from "@/src/presentation/response/interfaces/entities/ProfileSchema.js";


export interface UserSchema {
    username: string;
    /** Format: email */
    email?: string;
    profile: Partial<ProfileSchema>;
}