import {NextFunction, Request, Response} from "express";
import {z} from "zod";
import UserService from "../services/UserService.js";

export default {
    async signUp(req: Request, res: Response, next: NextFunction) {
        const validator = z.object({
            email: z.string().email(),
            username: z.string().min(4).max(20),
            password: z.string().min(8),
            initialLanguage: z.optional(z.string().length(2))
        }).strict();
        const body = validator.parse(req.body);
        const newUser = await UserService.createUser(body.username, body.email, body.password);
        res.status(201).json(newUser);
    }
};