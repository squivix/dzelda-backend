import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {lessonController} from "@/src/controllers/LessonController.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";

export const lessonsRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/lessons/`, lessonController.getLessons);
    fastify.post(`/lessons/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: lessonController.createLesson
    });
    fastify.get(`/lessons/:lessonId/`, lessonController.getLesson);
    fastify.patch(`/lessons/:lessonId/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: lessonController.updateLesson
    });
    fastify.delete(`/lessons/:lessonId/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: lessonController.deleteLesson
    });
    fastify.get(`/collections/:collectionId/lessons/:lessonId/next/`, lessonController.getNextLessonInCollection);
    fastify.get(`/users/me/lessons/history/`, {preHandler: [requiresAuth, requiresEmailConfirmed], handler: lessonController.getUserLessonsHistory});
    fastify.post(`/users/me/lessons/history/`, {preHandler: [requiresAuth, requiresEmailConfirmed], handler: lessonController.addLessonToUserHistory});
    done();
};
