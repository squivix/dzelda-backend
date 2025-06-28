import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {LanguageService} from "@/src/services/LanguageService.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import {UserService} from "@/src/services/UserService.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {User} from "@/src/models/entities/auth/User.js";
import {APIError} from "@/src/utils/errors/APIError.js";
import {TranslationLanguage} from "@/src/models/entities/TranslationLanguage.js";
import {booleanStringValidator} from "@/src/validators/utilValidators.js";
import {languageSerializer} from "@/src/presentation/response/serializers/Language/LanguageSerializer.js";
import {translationLanguageSerializer} from "@/src/presentation/response/serializers/TranslationLanguage/TranslationLanguageSerializer.js";
import {learnerLanguageSerializer} from "@/src/presentation/response/serializers/Language/LearnerLanguageSerializer.js";

class LanguageController {
    async getLanguages(request: FastifyRequest, reply: FastifyReply) {
        const queryParamsValidator = z.object({
            sortBy: z.union([z.literal("name"), z.literal("learnersCount"), z.literal("secondSpeakersCount")]).optional().default("name"),
            sortOrder: z.union([z.literal("asc"), z.literal("desc")]).optional().default("asc"),
        });
        const queryParams = queryParamsValidator.parse(request.query);
        const serializer = languageSerializer;

        const languageService = new LanguageService(request.em);
        const sort = {sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder};
        const languages = await languageService.getLanguages(sort, serializer.view);
        reply.send(serializer.serializeList(languages));
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
        const serializer = learnerLanguageSerializer;

        const languageService = new LanguageService(request.em);
        const filters = {};
        const sort = {sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder};
        const languageMappings = await languageService.getUserLanguages(user, filters, sort, serializer.view);
        reply.send(serializer.serializeList(languageMappings));
    }

    async addLanguageToUser(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;

        const bodyValidator = z.object({
            languageCode: languageCodeValidator,
            preferredTranslationLanguageCodes: z.array(languageCodeValidator).min(1).optional()
        });
        const body = bodyValidator.parse(request.body);
        const serializer = learnerLanguageSerializer;

        const languageService = new LanguageService(request.em);
        const language = await languageService.findLearningLanguage({code: body.languageCode});
        if (!language)
            throw new ValidationAPIError({language: "not found"});
        let translationLanguages: TranslationLanguage[] | undefined;
        if (body.preferredTranslationLanguageCodes) {
            translationLanguages = await languageService.findTranslationLanguages({code: {$in: body.preferredTranslationLanguageCodes}});
            if (translationLanguages.length !== body.preferredTranslationLanguageCodes.length)
                throw new ValidationAPIError({preferredTranslationLanguageCodes: "not found"});
        }
        const existingLanguageMapping = await languageService.getUserLanguage(language.code, user, serializer.view);
        if (existingLanguageMapping) {
            reply.status(200).send(serializer.serialize(existingLanguageMapping));
            return;
        }

        await languageService.addLanguageToUser({user, language, preferredTranslationLanguages: translationLanguages});
        const newLanguageMapping = (await languageService.getUserLanguage(language.code, user, serializer.view))!;
        reply.status(201).send(serializer.serialize(newLanguageMapping));
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
        const serializer = learnerLanguageSerializer;

        const languageService = new LanguageService(request.em);
        const language = await languageService.findLearningLanguage({code: pathParams.languageCode});
        if (!language)
            throw new NotFoundAPIError("Language");
        const languageMapping = await languageService.findLearnerLanguageMapping({language: language, learner: user.profile});
        if (!languageMapping)
            throw new APIError(404, "User is not learning language");

        let translationLanguages: TranslationLanguage[] | undefined;
        if (body.preferredTranslationLanguageCodes) {
            translationLanguages = await languageService.findTranslationLanguages({code: {$in: body.preferredTranslationLanguageCodes}});
            if (translationLanguages.length !== body.preferredTranslationLanguageCodes.length)
                throw new ValidationAPIError({preferredTranslationLanguageCodes: "not found"});
            //keep order
            const codeToTl: Record<string, TranslationLanguage> = {};
            translationLanguages.forEach(tl => codeToTl[tl.code] = tl);
            translationLanguages = body.preferredTranslationLanguageCodes.map(c => codeToTl[c]);
        }
        await languageService.updateUserLanguage(languageMapping, {lastOpened: body.lastOpened, preferredTranslationLanguages: translationLanguages});
        const updatedLanguageMapping = await languageService.getUserLanguage(language.code, user, serializer.view);
        reply.status(200).send(serializer.serialize(updatedLanguageMapping));
    }

    async deleteUserLanguage(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;
        const pathParamsValidator = z.object({
            languageCode: languageCodeValidator
        });
        const pathParams = pathParamsValidator.parse(request.params);

        const languageService = new LanguageService(request.em);
        const language = await languageService.findLearningLanguage({code: pathParams.languageCode});
        if (!language)
            throw new NotFoundAPIError("Language");
        const languageMapping = await languageService.findLearnerLanguageMapping({language: language, learner: user.profile});
        if (!languageMapping)
            throw new APIError(404, "User is not learning language");

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
        const language = await languageService.findLearningLanguage({code: pathParams.languageCode});
        if (!language)
            throw new NotFoundAPIError("Language");
        const languageMapping = await languageService.findLearnerLanguageMapping({language: language, learner: user.profile});
        if (!languageMapping)
            throw new APIError(404, "User is not learning language");

        await languageService.removeLanguageFromUser(languageMapping);
        await languageService.addLanguageToUser({user, language});
        reply.status(204).send();
    }

    async getTranslationLanguages(request: FastifyRequest, reply: FastifyReply) {
        const queryParamsValidator = z.object({
            isDefault: booleanStringValidator.optional()
        });
        const queryParams = queryParamsValidator.parse(request.query);
        const serializer = translationLanguageSerializer;

        const languageService = new LanguageService(request.em);
        const translationLanguages = await languageService.getTranslationLanguages({isDefault: queryParams.isDefault}, serializer.view);
        reply.send(serializer.serializeList(translationLanguages));
    }
}

export const languageController = new LanguageController();
