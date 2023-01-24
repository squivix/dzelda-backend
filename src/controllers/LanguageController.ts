import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import LanguageService from "@/src/services/LanguageService.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import UserService from "@/src/services/UserService.js";
import {ForbiddenAPIError} from "@/src/utils/errors/ForbiddenAPIError.js";
import {usernameValidator} from "@/src/validators/userValidator.js";

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
            username: usernameValidator
        });
        const pathParams = validator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        if (!user || (!user.profile.isPublic && user !== request.user))
            throw new NotFoundAPIError("User");

        const languageService = new LanguageService(request.em);
        const filters = {};
        const languages = await languageService.getUserLanguages(user, filters);
        reply.send(languages);
    }

    async addLanguageToUser(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({
            username: usernameValidator,
        });
        const pathParams = pathParamsValidator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        if (!user || user !== request.user)
            throw new ForbiddenAPIError();

        const bodyValidator = z.object({
            code: z.string().min(2).max(4).regex(/^[A-Za-z0-9]*$/)
        });
        const body = bodyValidator.parse(request.body);
        const languageService = new LanguageService(request.em);
        const language = await languageService.getLanguage(body.code);
        if (!language)
            throw new NotFoundAPIError("Language");

        const newLanguageMapping = await languageService.addLanguageToUser(user, language);
        reply.status(201).send(newLanguageMapping);
    }
}

export default new LanguageController();