import {z} from "zod";
import UserService from "@/src/services/UserService.js";
import {FastifyReply, FastifyRequest} from "fastify";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import {userSerializer} from "@/src/schemas/serializers/UserSerializer.js";

class UserController {

    async signUp(request: FastifyRequest, reply: FastifyReply) {
        const validator = z.object({
            email: z.string().max(256).email(),
            username: z.string().min(4).max(20).regex(/^[A-Za-z0-9]*$/),
            password: z.string().min(8),
            initialLanguage: z.optional(z.string().min(2).max(4))
        }).strict();
        const body = validator.parse(request.body);
        const userService = new UserService(request.em);
        const newUser = await userService.createUser(body.username, body.email, body.password, body.initialLanguage);

        reply.status(201).send(newUser);
    }

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

    async getUser(request: FastifyRequest, reply: FastifyReply) {
        const validator = z.object({
            username: z.string().min(4).max(20).regex(/^[A-Za-z0-9]*$/).or(z.literal("me"))
        });
        let pathParamsParse = validator.safeParse(request.params);
        if (!pathParamsParse.success)
            throw new NotFoundAPIError("User");
        const pathParams = pathParamsParse.data;

        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        // private user don't exist to the outside
        if (!user || (!user.profile.isPublic && user !== request.user))
            throw new NotFoundAPIError("User");
        reply.status(200).send(userSerializer.serialize(user, {hiddenFields: request.user !== user ? ["email"] : []}));
    }
}

export const userController = new UserController();