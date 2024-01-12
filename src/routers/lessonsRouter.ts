import {FastifyPluginCallback} from "fastify/types/plugin.js";
import LessonController from "@/src/controllers/LessonController.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";

export const lessonsRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/lessons/`, LessonController.getLessons);
    fastify.post(`/lessons/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: LessonController.createLesson
    });
    fastify.get(`/lessons/:lessonId/`, LessonController.getLesson);
    fastify.put(`/lessons/:lessonId/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: LessonController.updateLesson
    });
    fastify.get(`/courses/:courseId/lessons/:lessonId/next/`, LessonController.getNextLessonInCourse);
    fastify.get(`/users/me/lessons/history/`, {preHandler: [requiresAuth, requiresEmailConfirmed], handler: LessonController.getUserLessonsHistory});
    fastify.post(`/users/me/lessons/history/`, {preHandler: [requiresAuth, requiresEmailConfirmed], handler: LessonController.addLessonToUserHistory});
    done();
};
