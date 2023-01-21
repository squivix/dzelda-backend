import {FastifyPluginCallback} from "fastify/types/plugin.js";
import LessonController from "@/src/controllers/LessonController.js";

export const lessonsRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/lessons/`, LessonController.getLessons);
    done();
};