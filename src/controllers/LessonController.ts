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
import {lessonTextValidator, lessonTitleValidator} from "@/src/validators/lessonValidators.js";
import {ForbiddenAPIError} from "@/src/utils/errors/ForbiddenAPIError.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import {lessonSerializer} from "@/src/presentation/response/serializers/entities/LessonSerializer.js";
import {API_ROOT} from "@/src/server.js";
import {lessonHistoryEntrySerializer} from "@/src/presentation/response/serializers/mappings/LessonHistoryEntrySerializer.js";
import {UserService} from "@/src/services/UserService.js";
import {validateFileObjectKey} from "@/src/controllers/ControllerUtils.js";
import {courseLevelsFilterValidator, courseLevelValidator} from "@/src/validators/courseValidator.js";
import {LanguageService} from "@/src/services/LanguageService.js";
import {Course} from "@/src/models/entities/Course.js";

class LessonController {
    async getLessons(request: FastifyRequest, reply: FastifyReply) {
        const queryParamsValidator = z.object({
            languageCode: languageCodeValidator.optional(),
            addedBy: usernameValidator.or(z.literal("me")).optional(),
            searchQuery: z.string().max(256).optional(),
            level: courseLevelsFilterValidator.default([]),
            hasAudio: booleanStringValidator.optional(),
            sortBy: z.union([z.literal("title"), z.literal("createdDate"), z.literal("pastViewersCount")]).optional().default("title"),
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

//TODO be consistent with error code for not found in body
    async createLesson(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            languageCode: languageCodeValidator,
            title: lessonTitleValidator,
            text: lessonTextValidator,
            isPublic: z.boolean().optional().default(true),
            level: courseLevelValidator.optional(),
            courseId: z.number().min(0).optional(),
            image: z.string().optional(),
            audio: z.string().optional(),
        });
        const body = bodyValidator.parse(request.body);
        const user = request.user as User;
        const courseService = new CourseService(request.em);
        const languageService = new LanguageService(request.em);
        const language = await languageService.findLanguage({code: body.languageCode});
        if (!language)
            throw new NotFoundAPIError("Language");
        let course;
        if (body.courseId) {
            course = await courseService.getCourse(body.courseId, request.user);

            if (!course)
                throw new ValidationAPIError({course: "Not found"});
            if (course.language !== language)
                throw new ValidationAPIError({course: "Not in the same language as lesson"});
            if (course.addedBy !== user.profile)
                throw new ForbiddenAPIError("User is not author of course");
        }
        const userService = new UserService(request.em);
        if (body.image)
            body.image = await validateFileObjectKey(userService, request.user as User, body.image, "lessonImage", "image");
        if (body.audio)
            body.audio = await validateFileObjectKey(userService, request.user as User, body.audio, "lessonAudio", "audio");

        const lessonService = new LessonService(request.em);
        const lesson = await lessonService.createLesson({
            title: body.title,
            text: body.text,
            language: language,
            isPublic: body.isPublic,
            level: body.level,
            course: course,
            image: body.image,
            audio: body.audio,
        }, user);
        reply.status(201).send(lessonSerializer.serialize(lesson));
    }

    async getLesson(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({lessonId: numericStringValidator});
        const pathParams = pathParamsValidator.parse(request.params);

        const lessonService = new LessonService(request.em);
        const lesson = await lessonService.getLesson(pathParams.lessonId, request.user);

        if (!lesson || (!lesson.isPublic && request?.user?.profile !== lesson.addedBy))
            throw new NotFoundAPIError("Lesson");
        reply.status(200).send(lessonSerializer.serialize(lesson));
    }

    async updateLesson(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({lessonId: numericStringValidator});
        const pathParams = pathParamsValidator.parse(request.params);

        const bodyValidator = z.object({
            courseId: z.number().min(0).optional().or(z.literal(null)),
            title: lessonTitleValidator,
            text: lessonTextValidator,
            isPublic: z.boolean().optional(),
            level: courseLevelValidator.optional(),
            image: z.string().optional(),
            audio: z.string().optional(),
        });
        const body = bodyValidator.parse(request.body);

        const lessonService = new LessonService(request.em);
        const lesson = await lessonService.getLesson(pathParams.lessonId, request.user);
        if (!lesson)
            throw new NotFoundAPIError("Lesson");
        if (request?.user?.profile !== lesson.addedBy)
            throw lesson.isPublic ? new ForbiddenAPIError() : new NotFoundAPIError("Lesson");

        const courseService = new CourseService(request.em);
        let newCourse: Course | null | undefined;
        if (body.courseId === null)
            newCourse = null;
        else if (body.courseId) {
            newCourse = await courseService.getCourse(body.courseId, request.user);
            if (!newCourse)
                throw new ValidationAPIError({course: "Not found"});
            if (request?.user?.profile !== newCourse.addedBy)
                throw new ForbiddenAPIError() ;
            if (newCourse.language !== lesson.language)
                throw new ValidationAPIError({course: "Cannot move lesson to a course in a different language"});
        }

        const userService = new UserService(request.em);
        if (body.image)
            body.image = await validateFileObjectKey(userService, request.user as User, body.image, "lessonImage", "image");
        if (body.audio)
            body.audio = await validateFileObjectKey(userService, request.user as User, body.audio, "lessonAudio", "audio");
        const updatedLesson = await lessonService.updateLesson(lesson, {
            course: newCourse,
            title: body.title,
            text: body.text,
            level: body.level,
            isPublic: body.isPublic,
            image: body.image,
            audio: body.audio
        }, request.user as User);
        reply.status(200).send(lessonSerializer.serialize(updatedLesson));
    }

    //TODO show deleted and privated lessons as deleted and privated lessons instead of hiding them. Do this with bookmarked courses as well
    async getUserLessonsHistory(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;
        const queryParamsValidator = z.object({
            languageCode: languageCodeValidator.optional(),
            addedBy: usernameValidator.or(z.literal("me")).optional(),
            searchQuery: z.string().max(256).optional(),
            level: courseLevelsFilterValidator.default([]),
            hasAudio: booleanStringValidator.optional(),
            sortBy: z.union([z.literal("timeViewed"), z.literal("title"), z.literal("createdDate"), z.literal("pastViewersCount")]).optional().default("title"),
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
            isInHistory: true
        };
        const sort = {sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder};
        const pagination = {page: queryParams.page, pageSize: queryParams.pageSize};
        const lessonService = new LessonService(request.em);
        const [lessonHistoryEntries, recordsCount] = await lessonService.getPaginatedLessonHistory(filters, sort, pagination, user);
        reply.send({
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(recordsCount / pagination.pageSize),
            data: lessonHistoryEntrySerializer.serializeList(lessonHistoryEntries)
        });
    }

    async addLessonToUserHistory(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;

        const bodyValidator = z.object({lessonId: z.number().min(0)});
        const body = bodyValidator.parse(request.body);

        const lessonService = new LessonService(request.em);
        const lesson = await lessonService.getLesson(body.lessonId, request.user);
        if (!lesson || (!lesson.isPublic && user.profile !== lesson.addedBy))
            throw new ValidationAPIError({lesson: "Not found"});
        // TODO: explicitly fetch request.user.profile.languagesLearning instead of populating in middleware
        if (!user.profile.languagesLearning.contains(lesson.language))
            throw new ValidationAPIError({lesson: "not in a language the user is learning"});

        const newLessonMapping = await lessonService.addLessonToUserHistory(lesson, user);
        reply.status(201).send(lessonSerializer.serialize(newLessonMapping.lesson));
    }

    async getNextLessonInCourse(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({courseId: numericStringValidator, lessonId: numericStringValidator});
        const pathParams = pathParamsValidator.parse(request.params);

        const courseService = new CourseService(request.em);
        const course = await courseService.findCourse({id: pathParams.courseId});

        if (!course)
            throw new NotFoundAPIError("Course");
        const nextLesson = await courseService.getNextLessonInCourse(course, pathParams.lessonId, request.user);
        if (!nextLesson || (!nextLesson.isPublic && request?.user?.profile !== course.addedBy))
            throw new NotFoundAPIError("Next lesson");

        reply.header("Location", `${API_ROOT}/lessons/${nextLesson.id}/`).status(303).send();
    }
}

export const lessonController = new LessonController();
