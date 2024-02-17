import {z} from "zod";

export const textTitleValidator = z.string().min(1).max(124);
export const textContentValidator = z.string().min(1).max(50_000);


