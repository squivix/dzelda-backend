import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import CourseService from "@/src/services/CourseService.js";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {usernameValidator} from "@/src/validators/userValidator.js";
import {UnauthenticatedAPIError} from "@/src/utils/errors/UnauthenticatedAPIError.js";

class CourseController {
    async getCourses(request: FastifyRequest, reply: FastifyReply) {
        const queryParamsValidator = z.object({
            languageCode: languageCodeValidator.optional(),
            addedBy: usernameValidator.optional(),
            searchQuery: z.string().min(1).max(256).optional(),
        });
        const queryParams = queryParamsValidator.parse(request.query);
        if (queryParams.addedBy == "me") {
            if (!request.user || request.user instanceof AnonymousUser)
                throw new UnauthenticatedAPIError(request.user)
            queryParams.addedBy = request.user?.username;
        }

        const courseService = new CourseService(request.em);

        const courses = await courseService.getCourses(queryParams, request.user);
        reply.send(courses);
    }
}

export default new CourseController();