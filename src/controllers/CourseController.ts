import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {CourseService} from "@/src/services/CourseService.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {usernameValidator} from "@/src/validators/userValidator.js";
import {UnauthenticatedAPIError} from "@/src/utils/errors/UnauthenticatedAPIError.js";
import {courseDescriptionValidator, courseTitleValidator} from "@/src/validators/courseValidator.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import {ForbiddenAPIError} from "@/src/utils/errors/ForbiddenAPIError.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {LanguageService} from "@/src/services/LanguageService.js";
import {numericStringValidator} from "@/src/validators/utilValidators.js";
import {UserService} from "@/src/services/UserService.js";
import {courseSerializer} from "@/src/presentation/response/serializers/entities/CourseSerializer.js";
import {vocabSerializer} from "@/src/presentation/response/serializers/entities/VocabSerializer.js";

class CourseController {
    async getCourses(request: FastifyRequest, reply: FastifyReply) {
        const queryParamsValidator = z.object({
            languageCode: languageCodeValidator.optional(),
            addedBy: usernameValidator.optional(),
            searchQuery: z.string().min(1).max(256).optional(),
            sortBy: z.union([z.literal("title"), z.literal("createdDate"), z.literal("learnersCount")]).optional().default("title"),
            sortOrder: z.union([z.literal("asc"), z.literal("desc")]).optional().default("asc"),
            page: z.coerce.number().int().min(1).optional().default(1),
            pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
        });
        const queryParams = queryParamsValidator.parse(request.query);
        if (queryParams.addedBy == "me") {
            if (!request.user || request.user instanceof AnonymousUser)
                throw new UnauthenticatedAPIError(request.user);
            queryParams.addedBy = request.user?.username;
        }
        const filters = {
            languageCode: queryParams.languageCode,
            addedBy: queryParams.addedBy,
            searchQuery: queryParams.searchQuery,
        };
        const sort = {sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder};
        const pagination = {page: queryParams.page, pageSize: queryParams.pageSize};
        const courseService = new CourseService(request.em);
        const [courses, recordsCount] = await courseService.getPaginatedCourses(filters, sort, pagination, request.user);
        reply.send({
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(recordsCount / pagination.pageSize),
            data: courseSerializer.serializeList(courses)
        });
    }

    async createCourse(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            data: z.object({
                languageCode: languageCodeValidator,
                title: courseTitleValidator,
                description: courseDescriptionValidator.optional(),
                isPublic: z.boolean().optional(),
                level: z.nativeEnum(LanguageLevel).optional(),
            }),
            image: z.string().optional(),
        });
        const body = bodyValidator.parse(request.body);

        const languageService = new LanguageService(request.em);
        const language = await languageService.findLanguage({code: body.data.languageCode});
        if (!language)
            throw new ValidationAPIError({language: {message: "not found"}});
        if (!language.isSupported)
            throw new ValidationAPIError({language: {message: "not supported"}});

        const courseService = new CourseService(request.em);
        const course = await courseService.createCourse({
            language: language,
            title: body.data.title,
            description: body.data.description,
            isPublic: body.data.isPublic,
            image: body.image,
            level: body.data.level
        }, request.user as User);
        reply.status(201).send(courseSerializer.serialize(course));
    }

    async getCourse(request: FastifyRequest, reply: FastifyReply) {
        const validator = z.object({courseId: numericStringValidator});
        const pathParams = validator.parse(request.params);

        const courseService = new CourseService(request.em);
        const course = await courseService.getCourse(pathParams.courseId, request.user);

        if (!course || (!course.isPublic && request?.user?.profile !== course.addedBy))
            throw new NotFoundAPIError("Course");
        reply.status(200).send(courseSerializer.serialize(course));
    }

    async updateCourse(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({courseId: numericStringValidator});
        const pathParams = pathParamsValidator.parse(request.params);

        const bodyValidator = z.object({
            data: z.object({
                title: courseTitleValidator,
                description: courseDescriptionValidator,
                isPublic: z.boolean(),
                lessonsOrder: z.array(z.number().int().min(0)).refine(e => new Set(e).size === e.length)
            }),
            image: z.string().optional()
        });
        const body = bodyValidator.parse(request.body);

        const courseService = new CourseService(request.em);
        const course = await courseService.getCourse(pathParams.courseId, request.user);

        if (!course)
            throw new NotFoundAPIError("Course");

        if (request?.user?.profile !== course.addedBy)
            throw course.isPublic ? new ForbiddenAPIError() : new NotFoundAPIError("Course");

        const lessonOrderIdSet = new Set(body.data.lessonsOrder);
        if (course.lessons.length !== body.data.lessonsOrder.length || !course.lessons.getItems().map(c => c.id).every(l => lessonOrderIdSet.has(l)))
            throw new ValidationAPIError({lessonsOrder: {message: "ids don't match course lessons: cannot add or remove lessons through this endpoint"}});

        const updatedCourse = await courseService.updateCourse(course, {
            title: body.data.title,
            description: body.data.description,
            isPublic: body.data.isPublic,
            image: body.image,
            lessonsOrder: body.data.lessonsOrder
        }, request.user as User);
        reply.status(200).send(courseSerializer.serialize(updatedCourse));
    }

    async getUserCoursesLearning(request: FastifyRequest, reply: FastifyReply) {
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
            addedBy: usernameValidator.optional(),
            searchQuery: z.string().min(1).max(256).optional(),
            level: z.nativeEnum(LanguageLevel).optional(),
            sortBy: z.union([z.literal("title"), z.literal("createdDate"), z.literal("learnersCount")]).optional().default("title"),
            sortOrder: z.union([z.literal("asc"), z.literal("desc")]).optional().default("asc"),
            page: z.coerce.number().int().min(1).optional().default(1),
            pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
        });
        const queryParams = queryParamsValidator.parse(request.query);

        if (queryParams.addedBy == "me")
            queryParams.addedBy = request.user?.username!;

        const filters = {
            languageCode: queryParams.languageCode,
            addedBy: queryParams.addedBy,
            searchQuery: queryParams.searchQuery,
            level: queryParams.level,
            isLearning: true
        };
        const sort = {sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder};
        const pagination = {page: queryParams.page, pageSize: queryParams.pageSize};
        const courseService = new CourseService(request.em);
        const [courses, recordsCount] = await courseService.getPaginatedCourses(filters, sort, pagination, user);
        reply.send({
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(recordsCount / pagination.pageSize),
            data: courseSerializer.serializeList(courses)
        });
    }
}

export default new CourseController();
