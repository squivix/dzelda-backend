import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {LanguageService} from "@/src/services/LanguageService.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import {UserService} from "@/src/services/UserService.js";
import {ForbiddenAPIError} from "@/src/utils/errors/ForbiddenAPIError.js";
import {usernameValidator} from "@/src/validators/userValidator.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {User} from "@/src/models/entities/auth/User.js";
import {languageSerializer} from "@/src/presentation/response/serializers/entities/LanguageSerializer.js";
import {learnerLanguageSerializer} from "@/src/presentation/response/serializers/mappings/LearnerLanguageSerializer.js";

class LanguageController {
    async getLanguages(request: FastifyRequest, reply: FastifyReply) {
        const queryParamsValidator = z.object({
            isSupported: z.string().regex(/(true|false)/ig).transform(v => v.toLowerCase() == "true").optional()
        });
        const queryParams = queryParamsValidator.parse(request.query);

        const languageService = new LanguageService(request.em);
        const languages = await languageService.getLanguages(queryParams);
        reply.send(languageSerializer.serializeList(languages));
    }

    async getUserLanguages(request: FastifyRequest, reply: FastifyReply) {
        const validator = z.object({
            username: usernameValidator.or(z.literal("me"))
        });
        const pathParams = validator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        if (!user || (!user.profile.isPublic && user !== request.user))
            throw new NotFoundAPIError("User");

        const languageService = new LanguageService(request.em);
        const filters = {};
        const languageMappings = await languageService.getUserLanguages(user, filters);
        reply.send(learnerLanguageSerializer.serializeList(languageMappings));
    }

    async addLanguageToUser(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({
            username: usernameValidator.or(z.literal("me")),
        });
        const pathParams = pathParamsValidator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        if (!user || user !== request.user)
            throw new ForbiddenAPIError();

        const bodyValidator = z.object({
            languageCode: languageCodeValidator
        });
        const body = bodyValidator.parse(request.body);
        const languageService = new LanguageService(request.em);
        const language = await languageService.findLanguage({code: body.languageCode});
        if (!language)
            throw new ValidationAPIError({language: {message: "not found"}});
        if (!language.isSupported)
            throw new ValidationAPIError({language: {message: "not supported"}});

        const existingLanguageMapping = await languageService.getUserLanguage(language.code, user);
        if (existingLanguageMapping)
            reply.status(200).send(learnerLanguageSerializer.serialize(existingLanguageMapping));
        const newLanguageMapping = await languageService.addLanguageToUser(user, language);
        reply.status(201).send(learnerLanguageSerializer.serialize(newLanguageMapping));
    }

    async updateUserLanguage(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({
            username: usernameValidator.or(z.literal("me")),
            languageCode: languageCodeValidator
        });
        const pathParams = pathParamsValidator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        if (!user || user !== request.user)
            throw new ForbiddenAPIError();

        const bodyValidator = z.object({
            lastOpened: z.literal("now")
        });
        bodyValidator.parse(request.body);

        const languageService = new LanguageService(request.em);
        const languageMapping = await languageService.getUserLanguage(pathParams.languageCode, request.user as User);
        if (!languageMapping)
            throw new NotFoundAPIError("Language");
        const updatedLanguageMapping = await languageService.updateUserLanguage(languageMapping);
        reply.status(200).send(learnerLanguageSerializer.serialize(updatedLanguageMapping));
    }

    async deleteUserLanguage(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({
            username: usernameValidator.or(z.literal("me")),
            languageCode: languageCodeValidator
        });
        const pathParams = pathParamsValidator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        if (!user || user !== request.user)
            throw new ForbiddenAPIError();

        const languageService = new LanguageService(request.em);
        const languageMapping = await languageService.getUserLanguage(pathParams.languageCode, request.user as User);
        if (!languageMapping)
            throw new NotFoundAPIError("Language");
        await languageService.removeLanguageFromUser(languageMapping);
        reply.status(204);
    }
}

export default new LanguageController();
