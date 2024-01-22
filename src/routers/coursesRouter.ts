import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {courseController} from "@/src/controllers/CourseController.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";

export const coursesRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/courses/`, courseController.getCourses);
    fastify.post(`/courses/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: courseController.createCourse
    });

    fastify.get(`/courses/:courseId/`, courseController.getCourse);

    fastify.put(`/courses/:courseId/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: courseController.updateCourse,
    });

    fastify.get(`/users/me/courses/bookmarked/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: courseController.getUserBookmarkedCourses,
    });

    fastify.post(`/users/me/courses/bookmarked/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: courseController.addCourseToUserBookmarks,
    });

    fastify.delete(`/users/me/courses/bookmarked/:courseId/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: courseController.removeCourseFromUserBookmarks,
    });

    done();
};
