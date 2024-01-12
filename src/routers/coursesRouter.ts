import {FastifyPluginCallback} from "fastify/types/plugin.js";
import CourseController from "@/src/controllers/CourseController.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";

export const coursesRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/courses/`, CourseController.getCourses);
    fastify.post(`/courses/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: CourseController.createCourse
    });

    fastify.get(`/courses/:courseId/`, CourseController.getCourse);

    fastify.put(`/courses/:courseId/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: CourseController.updateCourse,
    });

    fastify.get(`/users/me/courses/bookmarked/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: CourseController.getUserBookmarkedCourses,
    });

    fastify.post(`/users/me/courses/bookmarked/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: CourseController.addCourseToUserBookmarks,
    });

    fastify.delete(`/users/me/courses/bookmarked/:courseId/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: CourseController.removeCourseFromUserBookmarks,
    });

    done();
};
