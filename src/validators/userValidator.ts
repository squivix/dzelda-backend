import {z} from "zod";

// TODO dont use this in sign up! me is not valid. Also make anonymous not valid
export const usernameValidator = z.string().min(4).max(20).regex(/^[A-Za-z0-9_]*$/).or(z.literal("me"));
