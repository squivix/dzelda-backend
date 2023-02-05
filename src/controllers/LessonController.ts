import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import LessonService from "@/src/services/LessonService.js";
import {lessonSerializer} from "@/src/schemas/response/serializers/LessonSerializer.js";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {usernameValidator} from "@/src/validators/userValidator.js";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";
import {UnauthenticatedAPIError} from "@/src/utils/errors/UnauthenticatedAPIError.js";
import {booleanStringValidator} from "@/src/validators/utilValidators.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";

class LessonController {
    async getLessons(request: FastifyRequest, reply: FastifyReply) {
        const validator = z.object({
            languageCode: languageCodeValidator.optional(),
            addedBy: usernameValidator.optional(),
            searchQuery: z.string().min(1).max(256).optional(),
            level: z.nativeEnum(LanguageLevel).optional(),
            hasAudio: booleanStringValidator.optional(),
        });

        const queryParams = validator.parse(request.query);
        if (queryParams.addedBy == "me") {
            if (!request.user || request.user instanceof AnonymousUser)
                throw new UnauthenticatedAPIError(request.user);
            queryParams.addedBy = request.user?.username;
        }
        const lessonService = new LessonService(request.em);

        const lessons = await lessonService.getLessons(queryParams, request.user);
        reply.send(lessonSerializer.serializeList(lessons));
    }
}

export default new LessonController();