import {z} from "zod";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";

export const BANNED_LITERAL_USERNAMES = ["me", AnonymousUser.name, "dzelda", "admin", "support", "moderator", "webmaster", "help", "guest"];
export const usernameValidator = z.string().min(4, "Username must be between 4 and 20 characters long").max(20, "Username must be between 4 and 20 characters long").regex(/^[A-Za-z0-9_]*$/, "Username must only use alphanumerical characters or underscore (A-Z,a-z,0-9,_)").refine(u => !BANNED_LITERAL_USERNAMES.includes(u), {message: `Username can't be one of reserved usernames`});
export const emailValidator = z.string().max(255, "Email address must be up to 256 characters long").email("Invalid email address");
export const passwordValidator = z.string().min(8, "Password must be at least 8 characters long");
