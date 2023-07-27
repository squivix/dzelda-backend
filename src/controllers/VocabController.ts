import {z} from "zod";
import {FastifyReply, FastifyRequest} from "fastify";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {vocabLevelValidator, vocabNotesValidator, vocabTextValidator} from "@/src/validators/vocabValidators.js";
import {LanguageService} from "@/src/services/LanguageService.js";
import {VocabService} from "@/src/services/VocabService.js";
import {getParser} from "@/src/utils/parsers/parsers.js";
import {usernameValidator} from "@/src/validators/userValidator.js";
import {UserService} from "@/src/services/UserService.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import {ForbiddenAPIError} from "@/src/utils/errors/ForbiddenAPIError.js";
import {User} from "@/src/models/entities/auth/User.js";
import {numericStringValidator} from "@/src/validators/utilValidators.js";
import {LessonService} from "@/src/services/LessonService.js";
import {vocabSerializer} from "@/src/presentation/response/serializers/entities/VocabSerializer.js";
import {learnerVocabSerializer} from "@/src/presentation/response/serializers/mappings/LearnerVocabSerializer.js";

class VocabController {

    async getVocabs(request: FastifyRequest, reply: FastifyReply) {
        const queryParamsValidator = z.object({
            languageCode: languageCodeValidator.optional(),
            searchQuery: z.string().min(1).max(256).optional(),
            sortBy: z.union([z.literal("text"), z.literal("lessonsCount"), z.literal("learnersCount")]).optional().default("text"),
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
        const language = await languageService.findLanguage({code: body.languageCode});
        if (!language)
            throw new ValidationAPIError({language: {message: "not found"}});
        if (!language.isSupported)
            throw new ValidationAPIError({language: {message: "not supported"}});

        const parser = getParser(language.code);
        const words = parser.parseText(body.text, true);

        if (words.length == 0)
            throw new ValidationAPIError({text: {message: "vocab is invalid for this language"}});
        if (words.length > 1 && !body.isPhrase)
            throw new ValidationAPIError({text: {message: "more than 1 word, but isPhrase is false"}});

        const vocabText = parser.combine(words);
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
        const pathParamsValidator = z.object({username: usernameValidator});
        const pathParams = pathParamsValidator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        if (!user || (!user.profile.isPublic && user !== request.user))
            throw new NotFoundAPIError("User");
        if (user !== request.user)
            throw new ForbiddenAPIError();

        const queryParamsValidator = z.object({
            languageCode: languageCodeValidator.optional(),
            searchQuery: z.string().min(1).max(256).optional(),
            level: vocabLevelValidator.optional(),
            sortBy: z.union([z.literal("text"), z.literal("lessonsCount"), z.literal("learnersCount")]).optional().default("text"),
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
        const pathParamsValidator = z.object({username: usernameValidator});
        const pathParams = pathParamsValidator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        if (!user || (!user.profile.isPublic && user !== request.user))
            throw new NotFoundAPIError("User");
        if (user !== request.user)
            throw new ForbiddenAPIError();

        const bodyValidator = z.object({vocabId: z.number().min(0)});
        const body = bodyValidator.parse(request.body);

        const vocabService = new VocabService(request.em);
        const vocab = await vocabService.findVocab({id: body.vocabId});
        if (!vocab)
            throw new ValidationAPIError({vocab: {message: "Not found"}});
        if (!(request.user as User).profile.languagesLearning.contains(vocab.language))
            throw new ValidationAPIError({vocab: {message: "not in a language the user is learning"}});

        const existingVocabMapping = await vocabService.getUserVocab(vocab.id, user.profile);
        if (existingVocabMapping)
            reply.status(200).send(learnerVocabSerializer.serialize(existingVocabMapping));

        const newVocabMapping = await vocabService.addVocabToUserLearning(vocab, user);
        reply.status(201).send(learnerVocabSerializer.serialize(newVocabMapping));
    }

    async getUserVocab(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({
            username: usernameValidator,
            vocabId: numericStringValidator
        });
        const pathParams = pathParamsValidator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        if (!user || (!user.profile.isPublic && user !== request.user))
            throw new NotFoundAPIError("User");
        if (user !== request.user)
            throw new ForbiddenAPIError();

        const vocabService = new VocabService(request.em);
        const mapping = await vocabService.getUserVocab(pathParams.vocabId, user.profile);
        if (!mapping)
            throw new NotFoundAPIError("Vocab");
        reply.send(learnerVocabSerializer.serialize(mapping));
    }

    async updateUserVocab(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({
            username: usernameValidator,
            vocabId: numericStringValidator
        });
        const pathParams = pathParamsValidator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        if (!user || (!user.profile.isPublic && user !== request.user))
            throw new NotFoundAPIError("User");
        if (user !== request.user)
            throw new ForbiddenAPIError();

        const bodyValidator = z.object({
            level: vocabLevelValidator.optional(),
            notes: vocabNotesValidator.optional()
        });
        const body = bodyValidator.parse(request.body);

        const vocabService = new VocabService(request.em);
        const mapping = await vocabService.findLearnerVocab({vocab: pathParams.vocabId, learner: user.profile});
        if (!mapping)
            throw new NotFoundAPIError("Vocab");
        const updatedMapping = await vocabService.updateUserVocab(mapping, body);
        reply.send(learnerVocabSerializer.serialize(updatedMapping));
    }

    async getLessonVocabs(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({lessonId: numericStringValidator});
        const pathParams = pathParamsValidator.parse(request.params);
        const lessonService = new LessonService(request.em);
        const lesson = await lessonService.getLesson(pathParams.lessonId, request.user);
        if (!lesson || (!lesson.course.isPublic && request?.user?.profile !== lesson.course.addedBy))
            throw new NotFoundAPIError("Lesson");

        const vocabService = new VocabService(request.em);

        const vocabs = await vocabService.getLessonVocabs(lesson, request.user as User);
        reply.send(learnerVocabSerializer.serializeList(vocabs));
    }
}

export const vocabController = new VocabController();
