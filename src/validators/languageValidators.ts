import {z} from "zod";

export const languageCodeValidator = z.string().min(2).max(4).regex(/^[A-Za-z]*$/).transform((code) => code.toLowerCase())