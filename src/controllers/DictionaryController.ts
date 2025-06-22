import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {DictionaryService} from "@/src/services/DictionaryService.js";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {User} from "@/src/models/entities/auth/User.js";
import {booleanStringValidator} from "@/src/validators/utilValidators.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {APIError} from "@/src/utils/errors/APIError.js";
import {LanguageService} from "@/src/services/LanguageService.js";
import {dictionarySerializer} from "@/src/presentation/response/serializers/Dictionary/DictionarySerializer.js";

class DictionaryController {
    async getDictionaries(request: FastifyRequest, reply: FastifyReply) {
        const queryParamsValidator = z.object({
            languageCode: languageCodeValidator.optional(),
            isPronunciation: booleanStringValidator.optional()
        });
        const queryParams = queryParamsValidator.parse(request.query);

        const filters = {languageCode: queryParams.languageCode, isPronunciation: queryParams.isPronunciation};
        const dictionaryService = new DictionaryService(request.em);
        const dictionaries = await dictionaryService.getDictionaries(filters, {sortBy: "name", sortOrder: "asc"});
        reply.send(dictionarySerializer.serializeList(dictionaries));
    }

    async getUserDictionaries(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;

        const queryParamsValidator = z.object({
            languageCode: languageCodeValidator.optional(),
            isPronunciation: booleanStringValidator.optional()
        });
        const queryParams = queryParamsValidator.parse(request.query);

        const filters = {languageCode: queryParams.languageCode, isPronunciation: queryParams.isPronunciation, isLearning: true};
        const dictionaryService = new DictionaryService(request.em);
        const dictionaries = await dictionaryService.getLearnerDictionaries(filters, user);
        reply.send(dictionarySerializer.serializeList(dictionaries.map(d => d.dictionary)));
    }

    async updateUserLanguageDictionaries(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({languageCode: languageCodeValidator});
        const pathParams = pathParamsValidator.parse(request.params);
        const bodyValidator = z.object({dictionaryIds: z.array(z.number().min(0))});
        const body = bodyValidator.parse(request.body);
        const user = request.user as User;
        const languageService = new LanguageService(request.em);
        const language = await languageService.findLearningLanguage({
            learners: user.profile,
            code: pathParams.languageCode
        });
        if (!language)
            throw new APIError(400, "Language not found or user is not learning language");

        const dictionaryService = new DictionaryService(request.em);
        const dictionaries = await dictionaryService.findDictionaries({id: body.dictionaryIds});
        if (dictionaries.length < body.dictionaryIds.length)
            throw new APIError(404, "Dictionary(s) not found with corresponding ids");
        for (const dictionary of dictionaries) {
            if (dictionary.language != language)
                throw new ValidationAPIError({dictionaryIds: `Dictionary with id ${dictionary.id} is not in language ${pathParams.languageCode}`});
        }
        await dictionaryService.updateUserLanguageDictionaries(body.dictionaryIds, user);
        reply.status(204).send();
    }
}


export const dictionaryController = new DictionaryController();
