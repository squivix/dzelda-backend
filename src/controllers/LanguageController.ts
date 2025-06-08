import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {LanguageService} from "@/src/services/LanguageService.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import {UserService} from "@/src/services/UserService.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {User} from "@/src/models/entities/auth/User.js";
import {languageSerializer} from "@/src/presentation/response/serializers/entities/LanguageSerializer.js";
import {learnerLanguageSerializer} from "@/src/presentation/response/serializers/mappings/LearnerLanguageSerializer.js";
import {APIError} from "@/src/utils/errors/APIError.js";
import {StatusCodes} from "http-status-codes";
import {TranslationLanguage} from "@/src/models/entities/TranslationLanguage.js";
import {translationLanguageSerializer} from "@/src/presentation/response/serializers/entities/TranslationLanguageSerializer.js";
import {booleanStringValidator} from "@/src/validators/utilValidators.js";

class LanguageController {
    async getLanguages(request: FastifyRequest, reply: FastifyReply) {
        const queryParamsValidator = z.object({
            sortBy: z.union([z.literal("name"), z.literal("learnersCount"), z.literal("secondSpeakersCount")]).optional().default("name"),
            sortOrder: z.union([z.literal("asc"), z.literal("desc")]).optional().default("asc"),
        });
        const queryParams = queryParamsValidator.parse(request.query);

        const languageService = new LanguageService(request.em);
        const sort = {sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder};
        const languages = await languageService.getLanguages(sort);
        reply.send(languageSerializer.serializeList(languages));
    }

    async getUserLanguages(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({username: z.string().min(1).or(z.literal("me"))});
        const pathParams = pathParamsValidator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        if (!user || (!user.profile.isPublic && user !== request.user))
            throw new NotFoundAPIError("User");
        const queryParamsValidator = z.object({
            sortBy: z.union([z.literal("name"), z.literal("learnersCount"), z.literal("lastOpened")]).optional().default("name"),
            sortOrder: z.union([z.literal("asc"), z.literal("desc")]).optional().default("asc"),
        });
        const queryParams = queryParamsValidator.parse(request.query);
        const languageService = new LanguageService(request.em);
        const filters = {};
        const sort = {sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder};
        const languageMappings = await languageService.getUserLanguages(user, filters, sort);
        reply.send(learnerLanguageSerializer.serializeList(languageMappings));
    }

    async addLanguageToUser(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;

        const bodyValidator = z.object({
            languageCode: languageCodeValidator,
            preferredTranslationLanguageCodes: z.array(languageCodeValidator).min(1).optional()
        });
        const body = bodyValidator.parse(request.body);
        const languageService = new LanguageService(request.em);
        const language = await languageService.findLearningLanguage({code: body.languageCode});
        if (!language)
            throw new ValidationAPIError({language: "not found"});
        let preferredTranslationLanguages: TranslationLanguage[] | undefined;
        if (body.preferredTranslationLanguageCodes) {
            preferredTranslationLanguages = await languageService.findTranslationLanguages({code: {$in: body.preferredTranslationLanguageCodes}});
            if (preferredTranslationLanguages.length !== body.preferredTranslationLanguageCodes.length)
                throw new ValidationAPIError({preferredTranslationLanguageCodes: "not found"});
        }
        const existingLanguageMapping = await languageService.getUserLanguage(language.code, user);
        if (existingLanguageMapping)
            reply.status(200).send(learnerLanguageSerializer.serialize(existingLanguageMapping));
        const newLanguageMapping = await languageService.addLanguageToUser({user, language, preferredTranslationLanguages});
        reply.status(201).send(learnerLanguageSerializer.serialize(newLanguageMapping));
    }

    async updateUserLanguage(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;
        const pathParamsValidator = z.object({
            languageCode: languageCodeValidator
        });
        const pathParams = pathParamsValidator.parse(request.params);

        const bodyValidator = z.object({
            lastOpened: z.literal("now").optional(),
            preferredTranslationLanguageCodes: z.array(languageCodeValidator).min(1).optional(),
        });
        const body = bodyValidator.parse(request.body);

        const languageService = new LanguageService(request.em);
        const languageMapping = await languageService.getUserLanguage(pathParams.languageCode, user);
        if (!languageMapping)
            throw new APIError(StatusCodes.NOT_FOUND, "User is not learning language", "The user is not learning this language.");
        let preferredTranslationLanguages: TranslationLanguage[] | undefined;
        if (body.preferredTranslationLanguageCodes) {
            preferredTranslationLanguages = await languageService.findTranslationLanguages({code: {$in: body.preferredTranslationLanguageCodes}});
            if (preferredTranslationLanguages.length !== body.preferredTranslationLanguageCodes.length)
                throw new ValidationAPIError({preferredTranslationLanguageCodes: "not found"});
            //keep order
            const codeToTl: Record<string, TranslationLanguage> = {};
            preferredTranslationLanguages.forEach(tl => codeToTl[tl.code] = tl);
            preferredTranslationLanguages = body.preferredTranslationLanguageCodes.map(c => codeToTl[c]);
        }
        const updatedLanguageMapping = await languageService.updateUserLanguage(languageMapping, {lastOpened: body.lastOpened, preferredTranslationLanguages: preferredTranslationLanguages});
        reply.status(200).send(learnerLanguageSerializer.serialize(updatedLanguageMapping));
    }

    async deleteUserLanguage(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;
        const pathParamsValidator = z.object({
            languageCode: languageCodeValidator
        });
        const pathParams = pathParamsValidator.parse(request.params);

        const languageService = new LanguageService(request.em);
        const languageMapping = await languageService.getUserLanguage(pathParams.languageCode, user);
        if (!languageMapping)
            throw new APIError(StatusCodes.NOT_FOUND, "User is not learning language", "The user is not learning this language.");
        await languageService.removeLanguageFromUser(languageMapping);
        reply.status(204).send();
    }

    async resetUserLanguageProgress(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;
        const pathParamsValidator = z.object({
            languageCode: languageCodeValidator
        });
        const pathParams = pathParamsValidator.parse(request.params);

        const languageService = new LanguageService(request.em);
        const languageMapping = await languageService.getUserLanguage(pathParams.languageCode, user);
        if (!languageMapping)
            throw new APIError(StatusCodes.NOT_FOUND, "User is not learning language", "The user is not learning this language.");
        const language = languageMapping.language;
        await languageService.removeLanguageFromUser(languageMapping);
        await languageService.addLanguageToUser({user, language});
        reply.status(204).send();
    }

    async getTranslationLanguages(request: FastifyRequest, reply: FastifyReply) {
        const queryParamsValidator = z.object({
            isDefault: booleanStringValidator.optional()
        });
        const queryParams = queryParamsValidator.parse(request.query);
        const languageService = new LanguageService(request.em);
        const translationLanguages = await languageService.getTranslationLanguages({isDefault: queryParams.isDefault});
        reply.send(translationLanguageSerializer.serializeList(translationLanguages));
    }
}

export const languageController = new LanguageController();
