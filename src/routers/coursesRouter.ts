import {FastifyPluginCallback} from "fastify/types/plugin.js";
import CourseController from "@/src/controllers/CourseController.js";
import {deleteFileOnFail, fileUploadMiddleware} from "@/src/middlewares/fileUploadMiddleware.js";
import {courseImageValidator} from "@/src/validators/courseValidator.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";

export const coursesRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/courses/`, CourseController.getCourses);
    fastify.post(`/courses/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed,
            fileUploadMiddleware({"image": {path: "courses/images", validate: courseImageValidator}})],
        handler: CourseController.createCourse,
        onResponse: deleteFileOnFail
    });

    fastify.get(`/courses/:courseId/`, CourseController.getCourse);

    fastify.put(`/courses/:courseId/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed,
            fileUploadMiddleware({"image": {path: "courses/images", validate: courseImageValidator}})],
        handler: CourseController.updateCourse,
        onResponse: deleteFileOnFail
    });

    fastify.get(`/users/me/courses/bookmarked/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: CourseController.getUserBookmarkedCourses,
    });

    fastify.post(`/users/me/courses/bookmarked/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: CourseController.addCourseToUserBookmarks,
    });

    done();
};
