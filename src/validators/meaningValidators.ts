import {z} from "zod";

export const meaningTextValidator = z.string().min(1).max(500);
