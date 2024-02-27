import {z} from "zod";
import {FastifyReply, FastifyRequest} from "fastify";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {vocabLevelValidator, vocabNotesValidator, vocabTextValidator} from "@/src/validators/vocabValidators.js";
import {LanguageService} from "@/src/services/LanguageService.js";
import {VocabService} from "@/src/services/VocabService.js";
import {getParser} from "dzelda-common";
import {UserService} from "@/src/services/UserService.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import {User} from "@/src/models/entities/auth/User.js";
import {booleanStringValidator, numericStringValidator} from "@/src/validators/utilValidators.js";
import {TextService} from "@/src/services/TextService.js";
import {vocabSerializer} from "@/src/presentation/response/serializers/entities/VocabSerializer.js";
import {learnerVocabSerializer} from "@/src/presentation/response/serializers/mappings/LearnerVocabSerializer.js";
import {APIError} from "@/src/utils/errors/APIError.js";
import {StatusCodes} from "http-status-codes";
import {PronunciationService} from "@/src/services/PronunciationService.js";
import {humanPronunciationSerializer} from "@/src/presentation/response/serializers/entities/HumanPronunciationSerializer.js";
import {ttsPronunciationSerializer} from "@/src/presentation/response/serializers/entities/TTSPronunciationSerializer.js";
import {enableTTSSynthesize} from "@/src/constants.js";

class VocabController {

    async getVocabs(request: FastifyRequest, reply: FastifyReply) {
        const queryParamsValidator = z.object({
            languageCode: languageCodeValidator.optional(),
            searchQuery: z.string().max(256).optional(),
            sortBy: z.union([z.literal("text"), z.literal("textsCount"), z.literal("learnersCount")]).optional().default("text"),
            sortOrder: z.union([z.literal("asc"), z.literal("desc")]).optional().default("asc"),
            page: z.coerce.number().int().min(1).optional().default(1),
            pageSize: z.coerce.number().int().min(1).max(200).optional().default(25),
        });

        const queryParams = queryParamsValidator.parse(request.query);
        const vocabService = new VocabService(request.em);
        const filters = {languageCode: queryParams.languageCode, searchQuery: queryParams.searchQuery};
        const sort = {sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder};
        const pagination = {page: queryParams.page, pageSize: queryParams.pageSize};
        const [vocabs, recordsCount] = await vocabService.getPaginatedVocabs(filters, sort, pagination);
        reply.send({
            //TODO check if recordsCount is 0 to avoid a message like Page 1 out of 0
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(recordsCount / pagination.pageSize),
            data: vocabSerializer.serializeList(vocabs)
        });
    }

    async createVocab(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            languageCode: languageCodeValidator,
            text: vocabTextValidator,
            isPhrase: z.boolean()
        });
        const body = bodyValidator.parse(request.body);

        const languageService = new LanguageService(request.em);
        const language = await languageService.findLearningLanguage({code: body.languageCode});
        if (!language)
            throw new ValidationAPIError({language: "not found"});

        const parser = getParser(language.code);
        const words = parser.splitWords(parser.parseText(body.text));

        if (words.length == 0)
            throw new ValidationAPIError({text: "vocab is invalid for this language"});
        if (words.length > 1 && !body.isPhrase)
            throw new ValidationAPIError({text: "more than 1 word, but isPhrase is false"});

        const vocabText = parser.combineWords(words);
        const vocabService = new VocabService(request.em);
        const existingVocab = await vocabService.getVocabByText({language: language, text: vocabText,});
        if (existingVocab) {
            reply.status(200).send(vocabSerializer.serialize(existingVocab));
            return;
        }
        const newVocab = await vocabService.createVocab({
            language: language,
            text: vocabText,
            isPhrase: body.isPhrase,
        });
        reply.status(201).send(vocabSerializer.serialize(newVocab));
    }

    async getUserVocabs(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;

        const queryParamsValidator = z.object({
            languageCode: languageCodeValidator.optional(),
            searchQuery: z.string().max(256).optional(),
            level: vocabLevelValidator.transform(l => [l]).or(z.array(vocabLevelValidator)).optional(),
            sortBy: z.union([z.literal("text"), z.literal("textsCount"), z.literal("learnersCount")]).optional().default("text"),
            sortOrder: z.union([z.literal("asc"), z.literal("desc")]).optional().default("asc"),
            page: z.coerce.number().int().min(1).optional().default(1),
            pageSize: z.coerce.number().int().min(1).max(200).optional().default(25),
        });
        const queryParams = queryParamsValidator.parse(request.query);
        const vocabService = new VocabService(request.em);

        const filters = {languageCode: queryParams.languageCode, level: queryParams.level, searchQuery: queryParams.searchQuery};
        const sort = {sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder};
        const pagination = {page: queryParams.page, pageSize: queryParams.pageSize};
        const [vocabs, recordsCount] = await vocabService.getPaginatedLearnerVocabs(filters, sort, pagination, user);
        reply.send({
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(recordsCount / pagination.pageSize),
            data: learnerVocabSerializer.serializeList(vocabs)
        });
    }

    async addVocabToUser(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;
        const bodyValidator = z.object({
            vocabId: z.number().min(0),
            level: vocabLevelValidator.optional()
        });
        const body = bodyValidator.parse(request.body);

        const vocabService = new VocabService(request.em);
        const vocab = await vocabService.findVocab({id: body.vocabId});
        if (!vocab)
            throw new ValidationAPIError({vocab: "Not found"});
        if (!(request.user as User).profile.languagesLearning.contains(vocab.language))
            throw new ValidationAPIError({vocab: "not in a language the user is learning"});

        const existingVocabMapping = await vocabService.getUserVocab(vocab.id, user.profile);
        if (existingVocabMapping)
            reply.status(200).send(learnerVocabSerializer.serialize(existingVocabMapping));

        const newVocabMapping = await vocabService.addVocabToUserLearning(vocab, user, body.level);
        reply.status(201).send(learnerVocabSerializer.serialize(newVocabMapping));
    }

    async getUserVocab(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;
        const pathParamsValidator = z.object({
            vocabId: numericStringValidator
        });
        const pathParams = pathParamsValidator.parse(request.params);

        const vocabService = new VocabService(request.em);
        const mapping = await vocabService.getUserVocab(pathParams.vocabId, user.profile);
        if (!mapping)
            throw new APIError(StatusCodes.NOT_FOUND, "User is not learning vocab", "The user is not learning this vocab.");
        reply.send(learnerVocabSerializer.serialize(mapping));
    }

    async updateUserVocab(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;
        const pathParamsValidator = z.object({
            vocabId: numericStringValidator
        });
        const pathParams = pathParamsValidator.parse(request.params);

        const bodyValidator = z.object({
            level: vocabLevelValidator.optional(),
            notes: vocabNotesValidator.optional()
        });
        const body = bodyValidator.parse(request.body);

        const vocabService = new VocabService(request.em);
        const mapping = await vocabService.findLearnerVocab({vocab: pathParams.vocabId, learner: user.profile});
        if (!mapping)
            throw new APIError(StatusCodes.NOT_FOUND, "User is not learning vocab", "The user is not learning this vocab.");
        const updatedMapping = await vocabService.updateUserVocab(mapping, body);
        reply.send(learnerVocabSerializer.serialize(updatedMapping));
    }

    async deleteUserVocab(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;
        const pathParamsValidator = z.object({
            vocabId: numericStringValidator
        });
        const pathParams = pathParamsValidator.parse(request.params);

        const vocabService = new VocabService(request.em);
        const mapping = await vocabService.findLearnerVocab({vocab: pathParams.vocabId, learner: user.profile});
        if (!mapping)
            throw new APIError(StatusCodes.NOT_FOUND, "User is not learning vocab", "The user is not learning this vocab.");
        await vocabService.deleteUserVocab(mapping);
        reply.status(204).send();
    }


    async getTextVocabs(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({textId: numericStringValidator});
        const pathParams = pathParamsValidator.parse(request.params);
        const textService = new TextService(request.em);
        const text = await textService.findText({id: pathParams.textId});
        if (!text || (!text.isPublic && request?.user?.profile !== text.addedBy))
            throw new NotFoundAPIError("Text");

        const vocabService = new VocabService(request.em);

        const vocabs = await vocabService.getTextVocabs(text, request.user as User);
        reply.send(learnerVocabSerializer.serializeList(vocabs));
    }

    async getUserSavedVocabsCount(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({username: z.string().min(1).or(z.literal("me"))});
        const pathParams = pathParamsValidator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        if (!user || (!user.profile.isPublic && user !== request.user))
            throw new NotFoundAPIError("User");
        const queryParamsValidator = z.object({
            savedOnFrom: z.coerce.date().optional(),
            savedOnTo: z.coerce.date().optional(),
            level: vocabLevelValidator.transform(l => [l]).or(z.array(vocabLevelValidator)).optional(),
            isPhrase: booleanStringValidator.optional(),
            groupBy: z.literal("language").optional(),
        });
        const queryParams = queryParamsValidator.parse(request.query);
        const vocabService = new VocabService(request.em);
        const stats = await vocabService.getUserSavedVocabsCount(user, {
            groupBy: queryParams.groupBy,
            filters: {
                savedOnFrom: queryParams.savedOnFrom,
                savedOnTo: queryParams.savedOnTo,
                isPhrase: queryParams.isPhrase,
                levels: queryParams.level
            }
        });
        reply.send(stats);
    }

    async getUserSavedVocabsCountTimeSeries(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({username: z.string().min(1).or(z.literal("me"))});
        const pathParams = pathParamsValidator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        if (!user || (!user.profile.isPublic && user !== request.user))
            throw new NotFoundAPIError("User");
        const epochDate = new Date(0);
        const nowDate = new Date();

        const queryParamsValidator = z.object({
            savedOnFrom: z.coerce.date().min(epochDate).max(nowDate).optional().default(epochDate),
            savedOnTo: z.coerce.date().min(epochDate).max(nowDate).optional().default(nowDate),
            savedOnInterval: z.union([z.literal("day"), z.literal("month"), z.literal("year")]).optional().default("year"),
            groupBy: z.literal("language").optional(),
            level: vocabLevelValidator.transform(l => [l]).or(z.array(vocabLevelValidator)).optional(),
            isPhrase: booleanStringValidator.optional(),
        });
        const queryParams = queryParamsValidator.parse(request.query);
        if (queryParams.savedOnFrom && queryParams.savedOnTo && queryParams.savedOnFrom > queryParams.savedOnTo)
            throw new ValidationAPIError({savedOnFrom: "Must be before savedOnTo"});
        const vocabService = new VocabService(request.em);
        const stats = await vocabService.getUserSavedVocabsCountTimeSeries(user, {
            savedOnFrom: queryParams.savedOnFrom,
            savedOnTo: queryParams.savedOnTo,
            savedOnInterval: queryParams.savedOnInterval,
            filters: {isPhrase: queryParams.isPhrase, levels: queryParams.level},
            groupBy: queryParams.groupBy,
        });
        reply.send(stats);
    }

    async getVocabHumanPronunciations(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({
            vocabId: numericStringValidator
        });
        const pathParams = pathParamsValidator.parse(request.params);

        const vocabService = new VocabService(request.em);
        const vocab = await vocabService.findVocab({id: pathParams.vocabId});
        if (!vocab)
            throw new NotFoundAPIError("vocab");

        const pronunciationService = new PronunciationService(request.em);
        const humanPronunciations = await pronunciationService.getHumanPronunciations(vocab.text, vocab.language);
        reply.send(humanPronunciationSerializer.serializeList(humanPronunciations));
    }

    async synthesizeTTSPronunciation(request: FastifyRequest, reply: FastifyReply) {
        if (!enableTTSSynthesize)
            reply.status(503).send();
        const bodyValidator = z.object({
            vocabId: z.number().min(0),
            voiceCode: z.string().min(1).optional()
        });
        const body = bodyValidator.parse(request.body);
        const vocabService = new VocabService(request.em);
        const vocab = await vocabService.getVocab(body.vocabId);
        if (!vocab)
            throw new ValidationAPIError({vocab: "Not found"});
        const voice = await vocabService.findTTSVoice({$or: [{code: body.voiceCode}, {isDefault: true}], language: vocab.language});
        if (!voice)
            throw new ValidationAPIError({voice: "Not found"});

        const existingPronunciation = vocab.ttsPronunciations.find(p => p.voice == voice);
        if (existingPronunciation) {
            reply.status(200).send(ttsPronunciationSerializer.serialize(existingPronunciation));
            return;
        }
        const newPronunciation = await vocabService.createVocabTTSPronunciation(vocab, voice);
        reply.status(200).send(ttsPronunciationSerializer.serialize(newPronunciation));
    }
}

export const vocabController = new VocabController();
