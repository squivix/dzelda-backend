import {z} from "zod";
import {FastifyReply, FastifyRequest} from "fastify";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {vocabTextValidator} from "@/src/validators/vocabValidators.js";
import {LanguageService} from "@/src/services/LanguageService.js";
import {VocabService} from "@/src/services/VocabService.js";
import {vocabSerializer} from "@/src/schemas/response/serializers/VocabSerializer.js";
import {parsers} from "@/src/utils/parsers/parsers.js";

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
        if (!language.isSupported)
            throw new ValidationAPIError({language: {message: "not supported"}});

        const parser = parsers[language.code];
        const words = parser.parseText(body.text);

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
            isPhrase: body.isPhrase
        });
        reply.status(201).send(vocabSerializer.serialize(newVocab));
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