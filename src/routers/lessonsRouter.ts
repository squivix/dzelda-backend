import {FastifyPluginCallback} from "fastify/types/plugin.js";
import LessonController from "@/src/controllers/LessonController.js";
import {requiresAuth} from "@/src/middlewares/authMiddleware.js";
import {deleteFileOnFail, singleFileUploadMiddleWare} from "@/src/middlewares/fileUploadMiddleWare.js";
import {lessonAudioValidator, lessonImageValidator} from "@/src/validators/lessonValidators.js";

export const lessonsRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/lessons/`, LessonController.getLessons);
    fastify.post(`/lessons/`, {
        preHandler: [requiresAuth, singleFileUploadMiddleWare({
            "image": {path: "lessons/images", validate: lessonImageValidator},
            "audio": {path: "lessons/audios", validate: lessonAudioValidator}
        })],
        handler: LessonController.createLesson,
        onResponse: deleteFileOnFail
    });
    done();
};