import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {LessonService} from "@/src/services/LessonService.js";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {usernameValidator} from "@/src/validators/userValidator.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {UnauthenticatedAPIError} from "@/src/utils/errors/UnauthenticatedAPIError.js";
import {booleanStringValidator, numericStringValidator} from "@/src/validators/utilValidators.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {CourseService} from "@/src/services/CourseService.js";
import {
    lessonLevelsFilterValidator,
    lessonLevelValidator,
    lessonTextValidator,
    lessonTitleValidator
} from "@/src/validators/lessonValidators.js";
import {ForbiddenAPIError} from "@/src/utils/errors/ForbiddenAPIError.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import {UserService} from "@/src/services/UserService.js";
import {lessonSerializer} from "@/src/presentation/response/serializers/entities/LessonSerializer.js";

class LessonController {
    async getLessons(request: FastifyRequest, reply: FastifyReply) {
        const validator = z.object({
            languageCode: languageCodeValidator.optional(),
            addedBy: usernameValidator.or(z.literal("me")).optional(),
            searchQuery: z.string().min(1).max(256).optional(),
            level: lessonLevelsFilterValidator.default([]),
            hasAudio: booleanStringValidator.optional(),
            sortBy: z.union([z.literal("title"), z.literal("createdDate"), z.literal("learnersCount")]).optional().default("title"),
            sortOrder: z.union([z.literal("asc"), z.literal("desc")]).optional().default("asc"),
            page: z.coerce.number().int().min(1).optional().default(1),
            pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
        });
        const queryParams = validator.parse(request.query);
        if (queryParams.addedBy == "me") {
            if (!request.user || request.user instanceof AnonymousUser)
                throw new UnauthenticatedAPIError(request.user);
            queryParams.addedBy = request.user?.username;
        }

        const filters = {
            languageCode: queryParams.languageCode,
            addedBy: queryParams.addedBy,
            searchQuery: queryParams.searchQuery,
            level: queryParams.level,
            hasAudio: queryParams.hasAudio,
        };
        const sort = {sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder};
        const pagination = {page: queryParams.page, pageSize: queryParams.pageSize};
        const lessonService = new LessonService(request.em);
        const [lessons, recordsCount] = await lessonService.getPaginatedLessons(filters, sort, pagination, request.user);
        reply.send({
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(recordsCount / pagination.pageSize),
            data: lessonSerializer.serializeList(lessons)
        });
    }

    async createLesson(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            data: z.object({
                title: lessonTitleValidator,
                text: lessonTextValidator,
                level: lessonLevelValidator.optional(),
                courseId: z.number().min(0)
            }),
            image: z.string().optional(),
            audio: z.string().optional(),
        });
        const body = bodyValidator.parse(request.body);

        const courseService = new CourseService(request.em);
        const course = await courseService.getCourse(body.data.courseId, request.user);
        if (!course || (!course.isPublic && course.addedBy !== request.user?.profile))
            throw new ValidationAPIError({course: {message: "not found"}});
        if (course.addedBy !== request.user?.profile)
            throw new ForbiddenAPIError();

        const lessonService = new LessonService(request.em);
        const lesson = await lessonService.createLesson({
            title: body.data.title,
            text: body.data.text,
            course: course,
            level: body.data.level,
            image: body.image,
            audio: body.audio,
        }, request.user as User);
        reply.status(201).send(lessonSerializer.serialize(lesson));
    }

    async getLesson(request: FastifyRequest, reply: FastifyReply) {
        const validator = z.object({lessonId: numericStringValidator});
        const pathParams = validator.parse(request.params);

        const lessonService = new LessonService(request.em);
        const lesson = await lessonService.getLesson(pathParams.lessonId, request.user);

        if (!lesson || (!lesson.course.isPublic && request?.user?.profile !== lesson.course.addedBy))
            throw new NotFoundAPIError("Lesson");
        reply.status(200).send(lessonSerializer.serialize(lesson));
    }

    async updateLesson(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({lessonId: numericStringValidator});
        const pathParams = pathParamsValidator.parse(request.params);

        const bodyValidator = z.object({
            data: z.object({
                courseId: z.number().min(0),
                title: lessonTitleValidator,
                text: lessonTextValidator,
            }),
            image: z.string().optional(),
            audio: z.string().optional()
        });
        const body = bodyValidator.parse(request.body);

        const lessonService = new LessonService(request.em);
        const lesson = await lessonService.getLesson(pathParams.lessonId, request.user);
        if (!lesson)
            throw new NotFoundAPIError("Lesson");
        if (request?.user?.profile !== lesson.course.addedBy)
            throw lesson.course.isPublic ? new ForbiddenAPIError() : new NotFoundAPIError("Lesson");

        const courseService = new CourseService(request.em);
        const newCourse = await courseService.getCourse(body.data.courseId, request.user);
        if (!newCourse)
            throw new ValidationAPIError({course: {message: "Not found"}});
        if (request?.user?.profile !== newCourse.addedBy)
            throw newCourse.isPublic ? new ForbiddenAPIError() : new ValidationAPIError({course: {message: "Not found"}});
        if (newCourse.language !== lesson.course.language)
            throw new ValidationAPIError({course: {message: "Cannot move lesson to a course in a different language"}});

        const updatedLesson = await lessonService.updateLesson(lesson, {
            course: newCourse,
            title: body.data.title,
            text: body.data.text,
            image: body.image,
            audio: body.audio
        }, request.user as User);
        reply.status(200).send(lessonSerializer.serialize(updatedLesson));

    }

    async getUserLessonsLearning(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({username: usernameValidator.or(z.literal("me"))});
        const pathParams = pathParamsValidator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        if (!user || (!user.profile.isPublic && user !== request.user))
            throw new NotFoundAPIError("User");
        if (user !== request.user)
            throw new ForbiddenAPIError();

        const queryParamsValidator = z.object({
            languageCode: languageCodeValidator.optional(),
            addedBy: usernameValidator.or(z.literal("me")).optional(),
            searchQuery: z.string().min(1).max(256).optional(),
            level: lessonLevelsFilterValidator.default([]),
            hasAudio: booleanStringValidator.optional(),
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
            hasAudio: queryParams.hasAudio,
            isLearning: true
        };
        const sort = {sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder};
        const pagination = {page: queryParams.page, pageSize: queryParams.pageSize};
        const lessonService = new LessonService(request.em);
        const [lessons, recordsCount] = await lessonService.getPaginatedLessons(filters, sort, pagination, user);
        reply.send({
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(recordsCount / pagination.pageSize),
            data: lessonSerializer.serializeList(lessons)
        });
    }

    async addLessonToUserLearning(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({username: usernameValidator.or(z.literal("me"))});
        const pathParams = pathParamsValidator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        if (!user || (!user.profile.isPublic && user !== request.user))
            throw new NotFoundAPIError("User");
        if (user !== request.user)
            throw new ForbiddenAPIError();

        const bodyValidator = z.object({lessonId: z.number().min(0)});
        const body = bodyValidator.parse(request.body);

        const lessonService = new LessonService(request.em);
        const lesson = await lessonService.getLesson(body.lessonId, request.user);
        if (!lesson || (!lesson.course.isPublic && request?.user?.profile !== lesson.course.addedBy))
            throw new ValidationAPIError({lesson: {message: "Not found"}});
        // TODO: explicitly fetch request.user.profile.languagesLearning instead of populating in middleware
        if (!(request.user as User).profile.languagesLearning.contains(lesson.course.language))
            throw new ValidationAPIError({lesson: {message: "not in a language the user is learning"}});

        const existingLessonMapping = await lessonService.getUserLessonLearning(lesson, user);
        if (existingLessonMapping)
            reply.status(200).send(lessonSerializer.serialize(existingLessonMapping.lesson));

        const newLessonMapping = await lessonService.addLessonToUserLearning(lesson, request.user as User);
        reply.status(201).send(lessonSerializer.serialize(newLessonMapping.lesson));
    }
}

export default new LessonController();
