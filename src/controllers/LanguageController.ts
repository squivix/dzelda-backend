import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import LanguageService from "@/src/services/LanguageService.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import UserService from "@/src/services/UserService.js";
import {UnauthorizedAPIError} from "@/src/utils/errors/UnauthorizedAPIError.js";
import {NotFoundError} from "@mikro-orm/core";

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
        const pathParams = validator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        if (!user.profile.isPublic && user !== request.user)
            throw new NotFoundAPIError("User");

        const languageService = new LanguageService(request.em);
        const filters = {};
        const languages = await languageService.getUserLanguages(user, filters);
        reply.send(languages);
    }

    async addLanguageToUser(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({
            username: z.string().min(4).max(20).regex(/^[A-Za-z0-9]*$/).or(z.literal("me"))
        });
        const pathParams = pathParamsValidator.parse(request.params);
        const userService = new UserService(request.em);
        let user;
        try {
            user = await userService.getUser(pathParams.username, request.user);
        } catch (e) {
            //do not expose if the user exists or not
            if (e instanceof NotFoundError)
                throw new UnauthorizedAPIError();
        }
        if (user !== request.user)
            throw new UnauthorizedAPIError();

        const bodyValidator = z.object({
            code: z.string().min(2).max(4).regex(/^[A-Za-z0-9]*$/)
        });
        const body = bodyValidator.parse(request.body);
        const languageService = new LanguageService(request.em);
        const language = await languageService.getLanguage(body.code);
        if (language == null)
            throw new NotFoundAPIError("Language");

        const newLanguageMapping = await userService.addLanguageToUser(user, language);
        reply.status(201).send(newLanguageMapping);
    }
}

export default new LanguageController();