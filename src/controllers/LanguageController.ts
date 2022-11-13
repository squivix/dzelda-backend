import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import LanguageService from "@/src/services/LanguageService.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import UserService from "@/src/services/UserService.js";

class LanguageController {
    async getLanguages(request: FastifyRequest, reply: FastifyReply) {
        const validator = z.object({
            isSupported: z.string().regex(/(true|false)/ig).transform(v => v.toLowerCase() == "true").optional()
        });

        const queryParams = validator.parse(request.query);
        const languageService = new LanguageService(request.em);

        const filters = {isSupported: queryParams.isSupported};

        const languages = await languageService.getLanguages(filters);
        reply.send(languages);
    }

    async getUserLanguages(request: FastifyRequest, reply: FastifyReply) {
        const validator = z.object({
            username: z.string().min(4).max(20).regex(/^[A-Za-z0-9]*$/).or(z.literal("me"))
        });
        const parsedPathParams = validator.safeParse(request.params);
        if (!parsedPathParams.success)
            throw new NotFoundAPIError("User");

        const pathParams = parsedPathParams.data;
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        if (!user.profile.isPublic && user !== request.user)
            throw new NotFoundAPIError("User");

        const languageService = new LanguageService(request.em);
        const filters = {};
        const languages = await languageService.getUserLanguages(user, filters);
        reply.send(languages);
    }
}

export default new LanguageController();