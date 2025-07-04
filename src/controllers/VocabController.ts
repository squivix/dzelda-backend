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
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {booleanStringValidator, numericStringValidator} from "@/src/validators/utilValidators.js";
import {TextService} from "@/src/services/TextService.js";
import {APIError} from "@/src/utils/errors/APIError.js";
import {PronunciationService} from "@/src/services/PronunciationService.js";
import {enableTTSSynthesize} from "@/src/constants.js";
import {textVisibilityFilter} from "@/src/filters/textVisibilityFilter.js";
import {VocabVariant} from "@/src/models/entities/VocabVariant.js";
import {humanPronunciationSerializer} from "@/src/presentation/response/serializers/HumanPronunciation/HumanPronunciationSerializer.js";
import {vocabVariantSerializer} from "@/src/presentation/response/serializers/VocabVariant/VocabVariantSerializer.js";
import {learnerVocabSerializer} from "@/src/presentation/response/serializers/Vocab/LearnerVocabSerializer.js";
import {learnerVocabForTextSerializer} from "@/src/presentation/response/serializers/Vocab/LearnerVocabForTextSerializer.js";
import {vocabSerializer} from "@/src/presentation/response/serializers/Vocab/VocabSerializer.js";
import {ttsPronunciationSerializer} from "@/src/presentation/response/serializers/TTSPronunciation/TtsPronunciationSerializer.js";
import {vocabForTextSerializer} from "@/src/presentation/response/serializers/Vocab/VocabForTextSerializer.js";
import {UnauthenticatedAPIError} from "@/src/utils/errors/UnauthenticatedAPIError.js";
import {serialize} from "@mikro-orm/core";
import {pronunciationController} from "@/src/controllers/PronunciationController.js";

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
        const serializer = vocabSerializer;

        const filters = {languageCode: queryParams.languageCode, searchQuery: queryParams.searchQuery};
        const sort = {sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder};
        const pagination = {page: queryParams.page, pageSize: queryParams.pageSize};
        const [vocabs, recordsCount] = await vocabService.getPaginatedVocabs(filters, sort, pagination, serializer.view);
        reply.send({
            //TODO check if recordsCount is 0 to avoid a message like Page 1 out of 0
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(recordsCount / pagination.pageSize),
            data: serializer.serializeList(vocabs)
        });
    }

    async createVocab(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            languageCode: languageCodeValidator,
            text: vocabTextValidator,
            variantText: vocabTextValidator.optional(),
            isPhrase: z.boolean()
        });
        const body = bodyValidator.parse(request.body);
        const serializer = vocabSerializer;

        const languageService = new LanguageService(request.em);
        const language = await languageService.findLearningLanguage({code: body.languageCode});
        if (!language)
            throw new ValidationAPIError({language: "not found"});

        const parser = getParser(language.code);
        const parseResult = parser.parseText(body.text);
        const words = parseResult.normalizedWords;

        if (words.length == 0)
            throw new ValidationAPIError({text: "vocab is invalid for this language"});
        if (words.length > 1 && !body.isPhrase)
            throw new ValidationAPIError({text: "more than 1 word, but isPhrase is false"});

        const vocabText = parser.combineWords(words);
        const vocabService = new VocabService(request.em);
        const existingVocab = await vocabService.findVocab({language: language, text: vocabText});
        let vocabId: number;
        if (!existingVocab) {
            const newVocab = await vocabService.createVocab({
                language: language,
                text: vocabText,
                isPhrase: body.isPhrase,
            });
            vocabId = newVocab.id
        } else
            vocabId = existingVocab.id


        if (body.variantText !== undefined && body.variantText != parseResult.normalizedText && parser.normalizeText(body.variantText) === parseResult.normalizedText)
            await vocabService.createVocabVariant(vocabId, body.variantText, true);

        const vocab = await vocabService.getVocab(vocabId, serializer.view);
        reply.status(existingVocab ? 200 : 201).send(serializer.serialize(vocab));
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
        const serializer = learnerVocabSerializer;

        const vocabService = new VocabService(request.em);
        const filters = {languageCode: queryParams.languageCode, level: queryParams.level, searchQuery: queryParams.searchQuery};
        const sort = {sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder};
        const pagination = {page: queryParams.page, pageSize: queryParams.pageSize};
        const [vocabs, recordsCount] = await vocabService.getPaginatedLearnerVocabs(filters, sort, pagination, user, serializer.view);
        reply.send({
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(recordsCount / pagination.pageSize),
            data: serializer.serializeList(vocabs)
        });
    }

    async addVocabToUser(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;
        const bodyValidator = z.object({
            vocabId: z.number().min(0),
            level: vocabLevelValidator.optional()
        });
        const body = bodyValidator.parse(request.body);
        const serializer = learnerVocabSerializer
        const vocabService = new VocabService(request.em);
        const vocab = await vocabService.findVocab({id: body.vocabId});
        if (!vocab)
            throw new ValidationAPIError({vocab: "Not found"});
        if (!(request.user as User).profile.languagesLearning.contains(vocab.language))
            throw new ValidationAPIError({vocab: "not in a language the user is learning"});

        const existingVocabMapping = await vocabService.findLearnerVocab({vocab: vocab.id, learner: user.profile});
        if (!existingVocabMapping)
            await vocabService.addVocabToUserLearning(vocab, user, body.level);

        const vocabMapping = (await vocabService.getUserVocab(vocab.id, user, serializer.view))!;
        reply.status(existingVocabMapping ? 200 : 201).send(serializer.serialize(vocabMapping));
    }

    async getUserVocab(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;
        const pathParamsValidator = z.object({
            vocabId: numericStringValidator
        });
        const pathParams = pathParamsValidator.parse(request.params);
        const serializer = learnerVocabSerializer;

        const vocabService = new VocabService(request.em);
        const mapping = await vocabService.getUserVocab(pathParams.vocabId, user, serializer.view);
        if (!mapping)
            throw new APIError(404, "User is not learning vocab", "The user is not learning this vocab.");
        reply.send(serializer.serialize(mapping));
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
        const serializer = learnerVocabSerializer;

        const vocabService = new VocabService(request.em);
        const mapping = await vocabService.findLearnerVocab({vocab: pathParams.vocabId, learner: user.profile});
        if (!mapping)
            throw new APIError(404, "User is not learning vocab", "The user is not learning this vocab.");
        await vocabService.updateUserVocab(mapping, body);
        const updatedMapping = (await vocabService.getUserVocab(pathParams.vocabId, user, serializer.view))!;
        reply.send(serializer.serialize(updatedMapping));
    }

    async deleteUserVocab(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({
            vocabId: numericStringValidator
        });
        const pathParams = pathParamsValidator.parse(request.params);
        const user = request.user as User;

        const vocabService = new VocabService(request.em);
        const mapping = await vocabService.findLearnerVocab({vocab: pathParams.vocabId, learner: user.profile});
        if (!mapping)
            throw new APIError(404, "User is not learning vocab", "The user is not learning this vocab.");
        await vocabService.deleteUserVocab(mapping);
        reply.status(204).send();
    }

    async getTextVocabs(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({textId: numericStringValidator});
        const pathParams = pathParamsValidator.parse(request.params);
        const textService = new TextService(request.em);
        const text = await textService.findText({$and: [{id: pathParams.textId,}, textVisibilityFilter(request.user)]});
        if (!text)
            throw new NotFoundAPIError("Text");

        const vocabService = new VocabService(request.em);

        const {learningVocabMappings, newVocabs} = await vocabService.getTextVocabs(text, request.user as User, learnerVocabForTextSerializer.view, vocabForTextSerializer.view);
        reply.send([
            ...learnerVocabForTextSerializer.serializeList(learningVocabMappings),
            ...vocabForTextSerializer.serializeList(newVocabs)
        ]);
    }

    async getUserSavedVocabsCount(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({username: z.string().min(1).or(z.literal("me"))});
        const pathParams = pathParamsValidator.parse(request.params);
        const userService = new UserService(request.em);
        if (pathParams.username == "me") {
            if (!request.isLoggedIn)
                throw new UnauthenticatedAPIError(request.user as AnonymousUser | null);
            pathParams.username = request.user!.username;
        }
        const profile = await userService.findProfile({user: {username: pathParams.username}});
        if (!profile || (!profile.isPublic && profile !== request.user?.profile))
            throw new NotFoundAPIError("User");
        const user = profile.user;

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
        if (pathParams.username == "me") {
            if (!request.isLoggedIn)
                throw new UnauthenticatedAPIError(request.user as AnonymousUser | null);
            pathParams.username = request.user!.username;
        }
        const profile = await userService.findProfile({user: {username: pathParams.username}});
        if (!profile || (!profile.isPublic && profile !== request.user?.profile))
            throw new NotFoundAPIError("User");
        const user = profile.user;

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

    async getVocabTTSPronunciations(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({
            vocabId: numericStringValidator
        });
        const pathParams = pathParamsValidator.parse(request.params);
        const serializer = ttsPronunciationSerializer;

        const vocabService = new VocabService(request.em);
        const vocab = await vocabService.findVocab({id: pathParams.vocabId});
        if (!vocab)
            throw new NotFoundAPIError("vocab");

        const pronunciationService = new PronunciationService(request.em);
        const ttsPronunciations = await pronunciationService.getVocabTTSPronunciations(vocab, serializer.view);
        reply.send(serializer.serializeList(ttsPronunciations));
    }

    async getVocabVariants(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({
            vocabId: numericStringValidator
        });
        const pathParams = pathParamsValidator.parse(request.params);
        const serializer = vocabVariantSerializer;

        const vocabService = new VocabService(request.em);
        const vocab = await vocabService.findVocab({id: pathParams.vocabId});
        if (!vocab)
            throw new NotFoundAPIError("vocab");

        const vocabVariants = await vocabService.getVocabVariants(vocab, serializer.view);
        reply.send(serializer.serializeList(vocabVariants));
    }

    async createVocabVariant(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            vocabId: z.number().min(0),
            text: vocabTextValidator,
        });
        const body = bodyValidator.parse(request.body);
        const serializer = vocabVariantSerializer;
        const vocabService = new VocabService(request.em);
        const vocab = await vocabService.getVocab(body.vocabId, {fields: ["id", "text"], relations: {language: {fields: ["code"]}}});
        if (!vocab)
            throw new NotFoundAPIError("vocab");
        const parser = getParser(vocab.language.code);
        const parseResult = parser.parseText(body.text);
        if (body.text === vocab.text)
            throw new ValidationAPIError({text: "Same as normalized vocab text"});
        if (parseResult.normalizedText !== vocab.text)
            throw new ValidationAPIError({text: "Does not normalize to vocab text"});

        const existingVariant = await vocabService.findVocabVariant({vocab: vocab, text: body.text}, ["ttsPronunciations"]);
        if (existingVariant) {
            reply.status(200).send(vocabVariantSerializer.serialize(existingVariant));
            return;
        }

        let newVariant = await vocabService.createVocabVariant(vocab.id, body.text);
        newVariant = (await vocabService.getVocabVariant(newVariant.id, serializer.view))!;
        reply.status(201).send(serializer.serialize(newVariant));
    }

    async getVocabHumanPronunciations(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({
            vocabId: numericStringValidator
        });
        const pathParams = pathParamsValidator.parse(request.params);
        const serializer = humanPronunciationSerializer;
        const vocabService = new VocabService(request.em);
        const vocab = await vocabService.findVocab({id: pathParams.vocabId});
        if (!vocab)
            throw new NotFoundAPIError("vocab");

        const pronunciationService = new PronunciationService(request.em);
        const humanPronunciations = await pronunciationService.getHumanPronunciations(vocab.text, vocab.language, serializer.view);
        reply.send(serializer.serializeList(humanPronunciations));
    }

    async synthesizeTTSPronunciation(request: FastifyRequest, reply: FastifyReply) {
        if (!enableTTSSynthesize)
            reply.status(503).send();
        const bodyValidator = z.object({
            vocabId: z.number().min(0),
            vocabVariantId: z.number().min(0).optional(),
            voiceCode: z.string().min(1).optional()
        });
        const body = bodyValidator.parse(request.body);
        const serializer = ttsPronunciationSerializer;

        const vocabService = new VocabService(request.em);
        const pronunciationService = new PronunciationService(request.em);
        const vocab = await vocabService.findVocab(body.vocabId);
        if (!vocab)
            throw new ValidationAPIError({vocab: "Not found"});
        const voice = await vocabService.findTTSVoice({$or: [{code: body.voiceCode}, {isDefault: true}], language: vocab.language});
        if (!voice)
            throw new ValidationAPIError({voice: "Not found"});
        let variant: VocabVariant | null = null;
        if (body.vocabVariantId !== undefined) {
            variant = await vocabService.findVocabVariant({id: body.vocabVariantId});
            if (!variant)
                throw new ValidationAPIError({vocabVariantId: "Not found"});
        }

        const existingPronunciation = await pronunciationService.findTTSPronunciation({vocab, vocabVariant: variant, voice});
        let pronunciationId: number;
        if (!existingPronunciation) {
            const newPronunciation = await vocabService.createVocabTTSPronunciation(vocab, variant, voice);
            pronunciationId = newPronunciation.id;
        } else pronunciationId = existingPronunciation.id

        const pronunciation = (await pronunciationService.getTTSPronunciation(pronunciationId, serializer.view))!;
        reply.status(200).send(serializer.serialize(pronunciation));
    }
}

export const vocabController = new VocabController();
