import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {vocabTextValidator} from "@/src/validators/vocabValidators.js";
import {LanguageService} from "@/src/services/LanguageService.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {VocabService} from "@/src/services/VocabService.js";
import {MeaningService} from "@/src/services/MeaningService.js";
import {meaningSerializer} from "@/src/schemas/response/serializers/MeaningSerializer.js";
import {User} from "@/src/models/entities/auth/User.js";

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
}

export const meaningController = new MeaningController();