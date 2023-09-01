import {FastifyPluginCallback} from "fastify/types/plugin.js";
import LessonController from "@/src/controllers/LessonController.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {deleteFileOnFail, fileUploadMiddleware} from "@/src/middlewares/fileUploadMiddleware.js";
import {lessonAudioValidator, lessonImageValidator} from "@/src/validators/lessonValidators.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";
import {requiresProfile} from "@/src/middlewares/requiresProfile.js";

export const lessonsRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/lessons/`, LessonController.getLessons);
    fastify.post(`/lessons/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed, requiresProfile, fileUploadMiddleware({
            "image": {path: "lessons/images", validate: lessonImageValidator},
            "audio": {path: "lessons/audios", validate: lessonAudioValidator}
        })],
        handler: LessonController.createLesson,
        onResponse: deleteFileOnFail
    });
    fastify.get(`/lessons/:lessonId/`, LessonController.getLesson);
    fastify.put(`/lessons/:lessonId/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed, requiresProfile, fileUploadMiddleware({
            "image": {path: "lessons/images", validate: lessonImageValidator},
            "audio": {path: "lessons/audios", validate: lessonAudioValidator}
        })],
        handler: LessonController.updateLesson,
        onResponse: deleteFileOnFail
    });
    fastify.get(`/users/:username/lessons/`, {preHandler: [requiresAuth, requiresEmailConfirmed, requiresProfile], handler: LessonController.getUserLessonsLearning});
    fastify.post(`/users/:username/lessons/`, {preHandler: [requiresAuth, requiresEmailConfirmed, requiresProfile], handler: LessonController.addLessonToUserLearning});
    done();
};
