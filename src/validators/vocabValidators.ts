import {z} from "zod";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";

export const vocabTextValidator = z.string().min(1).max(255);

export const vocabLevelValidator = z.preprocess((input) => {
    const processed = z.number().or(z.string().regex(/^-?\d+$/)).transform(Number).safeParse(input);
    return processed.success ? processed.data : input;
}, z.nativeEnum(VocabLevel))
export const vocabNotesValidator = z.string().min(0).max(2048);
