import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import CourseService from "@/src/services/CourseService.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {usernameValidator} from "@/src/validators/userValidator.js";
import {UnauthenticatedAPIError} from "@/src/utils/errors/UnauthenticatedAPIError.js";
import {courseDescriptionValidator, courseTitleValidator} from "@/src/validators/courseValidator.js";
import LanguageService from "@/src/services/LanguageService.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";
import {validateSquareImage} from "@/src/utils/utils.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import {courseSerializer} from "@/src/schemas/response/serializers/CourseSerializer.js";

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
        reply.send(courseSerializer.serializeList(courses));
    }

    async createCourse(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            language: languageCodeValidator,
            title: courseTitleValidator,
            description: courseDescriptionValidator.optional(),
            isPublic: z.boolean().optional(),
            level: z.nativeEnum(LanguageLevel).optional(),
        });
        const body = bodyValidator.parse((request.body as any).data);
        const image = request.files?.["image"]?.[0];
        if (image && image.path)
            validateSquareImage(image)


        const languageService = new LanguageService(request.em);
        const language = await languageService.getLanguage(body.language)
        if (!language)
            throw new ValidationAPIError({language: {message: "language not found"}});

        const courseService = new CourseService(request.em);
        const course = await courseService.createCourse({
            language: language,
            title: body.title,
            description: body.description,
            isPublic: body.isPublic,
            image: image?.path,
            level: body.level
        }, request.user as User);
        reply.status(201).send(courseSerializer.serialize(course));
    }

    async getCourse(request: FastifyRequest, reply: FastifyReply) {
        const validator = z.object({courseId: z.string().regex(/^\d+$/).transform(Number)});
        const pathParams = validator.parse(request.params);

        const courseService = new CourseService(request.em);
        const course = await courseService.getCourse(pathParams.courseId, request.user);

        if (!course || (!course.isPublic && request?.user?.profile !== course.addedBy))
            throw new NotFoundAPIError("Course");
        reply.status(200).send(courseSerializer.serialize(course));
    }
}

export default new CourseController();