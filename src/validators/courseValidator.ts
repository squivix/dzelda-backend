import {z} from "zod";

export const courseTitleValidator = z.string().min(1).max(255);
export const courseDescriptionValidator = z.string().max(500);