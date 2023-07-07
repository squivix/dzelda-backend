import {z} from "zod";
// .max(4)
export const languageCodeValidator = z.string().min(2).regex(/^[A-Za-z]*$/).transform((code) => code.toLowerCase())
