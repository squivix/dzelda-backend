import {z} from "zod";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";

export const BANNED_LITERAL_USERNAMES = ["me", AnonymousUser.name, "admin", "support", "moderator", "webmaster", "help", "guest"]

export const usernameValidator = z.string().min(4).max(20).regex(/^[A-Za-z0-9_]*$/).refine(u => !BANNED_LITERAL_USERNAMES.includes(u), {message: `Username can't be ${BANNED_LITERAL_USERNAMES.join("or ")}`})
export const passwordValidator = z.string().min(8);
