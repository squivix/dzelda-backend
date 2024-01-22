import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {DictionaryService} from "@/src/services/DictionaryService.js";
import {dictionarySerializer} from "@/src/presentation/response/serializers/entities/DictionarySerializer.js";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {User} from "@/src/models/entities/auth/User.js";

class DictionaryController {
    async getDictionaries(request: FastifyRequest, reply: FastifyReply) {
        const queryParamsValidator = z.object({
            languageCode: languageCodeValidator.optional(),
        });
        const queryParams = queryParamsValidator.parse(request.query);

        const filters = {languageCode: queryParams.languageCode};
        const dictionaryService = new DictionaryService(request.em);
        const dictionaries = await dictionaryService.getDictionaries(filters, {sortBy: "name", sortOrder: "asc"}, request.user);
        reply.send(dictionarySerializer.serializeList(dictionaries));
    }

    async getUserDictionaries(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;

        const queryParamsValidator = z.object({
            languageCode: languageCodeValidator.optional(),
        });
        const queryParams = queryParamsValidator.parse(request.query);

        const filters = {languageCode: queryParams.languageCode, isLearning: true};
        const dictionaryService = new DictionaryService(request.em);
        const dictionaries = await dictionaryService.getDictionaries(filters, {sortBy: "name", sortOrder: "asc"}, user);
        reply.send(dictionarySerializer.serializeList(dictionaries));
    }
}


export const dictionaryController = new DictionaryController();
