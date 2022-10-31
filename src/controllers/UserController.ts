import {z} from "zod";
import UserService from "../services/UserService.js";
import {FastifyReply, FastifyRequest} from "fastify";

export default {
    async signUp(request: FastifyRequest, reply: FastifyReply) {
        const validator = z.object({
            email: z.string().email(),
            username: z.string().min(4).max(20).regex(/^\S*$/),
            password: z.string().min(8),
            initialLanguage: z.optional(z.string().length(2))
        }).strict();
        const body = validator.parse(request.body);
        const newUser = await UserService.createUser(body.username, body.email, body.password);
        reply.status(201).send(newUser);
    }
};