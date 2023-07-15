import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {usernameValidator} from "@/src/validators/userValidator.js";
import {UserService} from "@/src/services/UserService.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import {ForbiddenAPIError} from "@/src/utils/errors/ForbiddenAPIError.js";
import {User} from "@/src/models/entities/auth/User.js";
import {DictionaryService} from "@/src/services/DictionaryService.js";
import {dictionarySerializer} from "@/src/presentation/response/serializers/entities/DictionarySerializer.js";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";

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
        });
        const queryParams = queryParamsValidator.parse(request.query);

        const filters = {languageCode: queryParams.languageCode, isLearning: true};
        const dictionaryService = new DictionaryService(request.em);
        const dictionaries = await dictionaryService.getDictionaries( filters, {sortBy: "name", sortOrder: "asc"}, user);
        reply.send(dictionarySerializer.serializeList(dictionaries));
    }
}


export default new DictionaryController();