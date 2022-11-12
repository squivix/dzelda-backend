import {z} from "zod";
import UserService from "../services/UserService.js";
import {FastifyReply, FastifyRequest} from "fastify";

export default {

    async signUp(request: FastifyRequest, reply: FastifyReply) {
        const validator = z.object({
            email: z.string().max(256).email(),
            username: z.string().min(4).max(20).regex(/^[A-Za-z0-9]*$/),
            password: z.string().min(8),
            initialLanguage: z.optional(z.string().length(2))
        }).strict();
        const body = validator.parse(request.body);
        const userService = new UserService(request.em);
        const newUser = await userService.createUser(body.username, body.email, body.password, body.initialLanguage);

        reply.status(201).send(newUser);
    },
    async login(request: FastifyRequest, reply: FastifyReply) {
        const validator = z.object({
            username: z.string().min(4).max(20).regex(/^[A-Za-z0-9]*$/),
            password: z.string().min(8),
        }).strict();
        const body = validator.parse(request.body);
        const userService = new UserService(request.em);
        const token = await userService.authenticateUser(body.username, body.password);

        reply.status(201).send({authToken: token});
    }
};