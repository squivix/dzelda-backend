import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {vocabLevelValidator, vocabTextValidator} from "@/src/validators/vocabValidators.js";
import {LanguageService} from "@/src/services/LanguageService.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {VocabService} from "@/src/services/VocabService.js";
import {MeaningService} from "@/src/services/MeaningService.js";
import {meaningSerializer} from "@/src/schemas/response/serializers/MeaningSerializer.js";
import {User} from "@/src/models/entities/auth/User.js";
import {usernameValidator} from "@/src/validators/userValidator.js";
import {UserService} from "@/src/services/UserService.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import {ForbiddenAPIError} from "@/src/utils/errors/ForbiddenAPIError.js";
import {vocabSerializer} from "@/src/schemas/response/serializers/VocabSerializer.js";
import {numericStringValidator} from "@/src/validators/utilValidators.js";
import {LessonService} from "@/src/services/LessonService.js";
import {lessonSerializer} from "@/src/schemas/response/serializers/LessonSerializer.js";

class MeaningController {
    async createMeaning(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            languageCode: languageCodeValidator,
            text: vocabTextValidator,
            vocabId: z.number().min(0)
        });
        const body = bodyValidator.parse(request.body);

        const languageService = new LanguageService(request.em);
        const language = await languageService.getLanguage(body.languageCode);
        if (!language)
            throw new ValidationAPIError({language: {message: "not found"}});

        const vocabService = new VocabService(request.em);
        const vocab = await vocabService.getVocab(body.vocabId);
        if (!vocab)
            throw new ValidationAPIError({vocab: {message: "not found"}});

        const meaningService = new MeaningService(request.em);
        const existingMeaning = await meaningService.getMeaningByText({vocab: vocab, language: language, text: body.text});
        if (existingMeaning) {
            reply.status(200).send(meaningSerializer.serialize(existingMeaning));
            return;
        }
        const newMeaning = await meaningService.createMeaning({
            language: language,
            text: body.text,
            vocab: vocab
        }, request.user as User);
        reply.status(201).send(meaningSerializer.serialize(newMeaning));
    }

    async getUserMeanings(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({username: usernameValidator});
        const pathParams = pathParamsValidator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        if (!user || (!user.profile.isPublic && user !== request.user))
            throw new NotFoundAPIError("User");
        if (user !== request.user)
            throw new ForbiddenAPIError();

        const queryParamsValidator = z.object({
            vocabId: numericStringValidator.optional()
        });
        const queryParams = queryParamsValidator.parse(request.query);

        const meaningService = new MeaningService(request.em);
        const meanings = await meaningService.getUserMeanings(queryParams, user);

        reply.send(meaningSerializer.serializeList(meanings));
    }

    async addMeaningToUser(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({username: usernameValidator});
        const pathParams = pathParamsValidator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        if (!user || (!user.profile.isPublic && user !== request.user))
            throw new NotFoundAPIError("User");
        if (user !== request.user)
            throw new ForbiddenAPIError();

        const bodyValidator = z.object({meaningId: z.number().min(0)});
        const body = bodyValidator.parse(request.body);

        const meaningService = new MeaningService(request.em);
        const meaning = await meaningService.getMeaning(body.meaningId);
        if (!meaning)
            throw new ValidationAPIError({meaning: {message: "Not found"}});
        if (!(request.user as User).profile.languagesLearning.contains(meaning.vocab.language))
            throw new ValidationAPIError({meaning: {message: "not in a language the user is learning"}});

        const existingMeaningMapping = await meaningService.getUserMeaning(meaning, user);
        if (existingMeaningMapping)
            reply.status(200).send(meaningSerializer.serialize(existingMeaningMapping.meaning));

        const newMeaningMapping = await meaningService.addMeaningToUserLearning(meaning, user);
        reply.status(201).send(meaningSerializer.serialize(newMeaningMapping.meaning));
    }
}

export const meaningController = new MeaningController();