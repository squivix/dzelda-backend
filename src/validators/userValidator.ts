import {z} from "zod";

export const usernameValidator = z.string().min(4).max(20).regex(/^[A-Za-z0-9]*$/).or(z.literal("me"))