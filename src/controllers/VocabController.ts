import {z} from "zod";
import {FastifyReply, FastifyRequest} from "fastify";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {vocabTextValidator} from "@/src/validators/vocabValidators.js";
import {LanguageService} from "@/src/services/LanguageService.js";
import {VocabService} from "@/src/services/VocabService.js";
import {vocabSerializer} from "@/src/schemas/response/serializers/VocabSerializer.js";
import {parsers} from "@/src/utils/parsers/parsers.js";
import {usernameValidator} from "@/src/validators/userValidator.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";
import {booleanStringValidator} from "@/src/validators/utilValidators.js";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";
import {UnauthenticatedAPIError} from "@/src/utils/errors/UnauthenticatedAPIError.js";
import {LessonService} from "@/src/services/LessonService.js";
import {lessonSerializer} from "@/src/schemas/response/serializers/LessonSerializer.js";

class VocabController {
    async createVocab(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            languageCode: languageCodeValidator,
            text: vocabTextValidator,
            isPhrase: z.boolean()
        });
        const body = bodyValidator.parse(request.body);

        const languageService = new LanguageService(request.em);
        const language = await languageService.getLanguage(body.languageCode);
        if (!language)
            throw new ValidationAPIError({language: {message: "not found"}});

        //TODO replace default english for tests with specifying english in test and avoid collisions somehow...
        const parser = parsers[language.code] ?? parsers["en"];
        const words = parser.parseText(body.text);

        if (words.length == 0)
            throw new ValidationAPIError({text: {message: "vocab is invalid for this language"}});
        if (words.length > 1 && !body.isPhrase)
            throw new ValidationAPIError({text: {message: "more than 1 word, but isPhrase is false"}});

        const vocabService = new VocabService(request.em);
        const vocab = await vocabService.createVocab({
            language: language,
            text: parser.combine(words),
            isPhrase: body.isPhrase
        });
        reply.status(201).send(vocabSerializer.serialize(vocab));
    }

    async getVocabs(request: FastifyRequest, reply: FastifyReply) {
        const validator = z.object({});

        const queryParams = validator.parse(request.query);
        const vocabService = new VocabService(request.em);

        const vocabs = await vocabService.getVocabs(queryParams, request.user);
        reply.send(vocabSerializer.serializeList(vocabs));
    }

}

export const vocabController = new VocabController();