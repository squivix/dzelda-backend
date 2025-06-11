import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {vocabTextValidator} from "@/src/validators/vocabValidators.js";
import {LanguageService} from "@/src/services/LanguageService.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {VocabService} from "@/src/services/VocabService.js";
import {MeaningService} from "@/src/services/MeaningService.js";
import {User} from "@/src/models/entities/auth/User.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import {numericStringValidator} from "@/src/validators/utilValidators.js";
import {meaningSerializer} from "@/src/presentation/response/serializers/entities/MeaningSerializer.js";
import {TextService} from "@/src/services/TextService.js";

class MeaningController {
    async createMeaning(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            languageCode: languageCodeValidator,
            text: vocabTextValidator,
            vocabId: z.number().min(0)
        });
        const body = bodyValidator.parse(request.body);

        const languageService = new LanguageService(request.em);
        const language = await languageService.findTranslationLanguage({code: body.languageCode});
        if (!language)
            throw new ValidationAPIError({language: "not found"});

        const vocabService = new VocabService(request.em);
        const vocab = await vocabService.getVocab(body.vocabId);
        if (!vocab)
            throw new ValidationAPIError({vocab: "not found"});

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
        const user = request.user as User;

        const queryParamsValidator = z.object({
            vocabId: numericStringValidator.optional(),
            sortBy: z.union([z.literal("text"), z.literal("learnersCount")]).optional().default("text"),
            sortOrder: z.union([z.literal("asc"), z.literal("desc")]).optional().default("asc"),
            page: z.coerce.number().int().min(1).optional().default(1),
            pageSize: z.coerce.number().int().min(1).max(50).optional().default(10),
        });
        const queryParams = queryParamsValidator.parse(request.query);
        const filters = {vocabId: queryParams.vocabId};
        const sort = {sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder};
        const pagination = {page: queryParams.page, pageSize: queryParams.pageSize};

        const meaningService = new MeaningService(request.em);
        const [meanings, recordsCount] = await meaningService.getUserMeanings(filters, sort, pagination, user);

        reply.send({
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(recordsCount / pagination.pageSize),
            data: meaningSerializer.serializeList(meanings)
        });
    }

    async getTextMeanings(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({textId: numericStringValidator});
        const pathParams = pathParamsValidator.parse(request.params);
        const textService = new TextService(request.em);
        const text = await textService.findText({id: pathParams.textId});
        if (!text || (!text.isPublic && request?.user?.profile !== text.addedBy))
            throw new NotFoundAPIError("Text");

        const meaningService = new MeaningService(request.em);

        const {meanings, learnerMeanings} = await meaningService.getTextMeanings(text, request.user);
        reply.send({
            meanings: meaningSerializer.serializeList(meanings, {ignore: ["vocab"]}),
            learnerMeanings: learnerMeanings ? meaningSerializer.serializeList(learnerMeanings, {ignore: ["vocab"]}) : undefined,
        });
    }

    async addMeaningToUser(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;

        const bodyValidator = z.object({meaningId: z.number().min(0)});
        const body = bodyValidator.parse(request.body);

        const meaningService = new MeaningService(request.em);
        const meaning = await meaningService.getMeaning(body.meaningId);
        if (!meaning)
            throw new ValidationAPIError({meaning: "Not found"});
        if (!(request.user as User).profile.languagesLearning.contains(meaning.vocab.language))
            throw new ValidationAPIError({meaning: "not in a language the user is learning"});

        const existingMeaningMapping = await meaningService.getUserMeaning(meaning.id, user);
        if (existingMeaningMapping)
            reply.status(200).send(meaningSerializer.serialize(existingMeaningMapping.meaning));

        const newMeaningMapping = await meaningService.addMeaningToUserLearning(meaning, user);
        reply.status(201).send(meaningSerializer.serialize(newMeaningMapping.meaning));
    }

    async removeMeaningFromUser(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;
        const pathParamsValidator = z.object({
            meaningId: numericStringValidator,
        });
        const pathParams = pathParamsValidator.parse(request.params);

        const meaningService = new MeaningService(request.em);
        const meaningMapping = await meaningService.getUserMeaning(pathParams.meaningId, user);
        if (!meaningMapping)
            throw new NotFoundAPIError("Meaning");

        await meaningService.removeMeaningFromUser(meaningMapping);
        reply.status(204).send();
    }
}

export const meaningController = new MeaningController();
