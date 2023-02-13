import {z} from "zod";

export const vocabTextValidator = z.string().min(1).max(255);