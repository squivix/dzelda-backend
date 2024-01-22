import {z} from "zod";

export const lessonTitleValidator = z.string().min(1).max(124);
export const lessonTextValidator = z.string().min(1).max(50_000);


