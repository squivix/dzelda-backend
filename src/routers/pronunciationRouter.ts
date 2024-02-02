import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {pronunciationController} from "@/src/controllers/PronunciationController.js";

export const pronunciationRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/human-pronunciations/`, pronunciationController.getHumanPronunciations);

    done();
};
