import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {vocabController} from "@/src/controllers/VocabController.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";

export const vocabRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.post(`/vocabs/`, {preHandler: [requiresAuth, requiresEmailConfirmed], handler: vocabController.createVocab});
    fastify.get(`/vocabs/`, vocabController.getVocabs);
    fastify.get(`/users/:username/vocabs/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: vocabController.getUserVocabs
    });
    fastify.post(`/users/:username/vocabs/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: vocabController.addVocabToUser
    });
    fastify.get(`/users/:username/vocabs/:vocabId/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: vocabController.getUserVocab
    });
    fastify.patch(`/users/:username/vocabs/:vocabId/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: vocabController.updateUserVocab
    });
    fastify.get(`/lessons/:lessonId/vocabs/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: vocabController.getLessonVocabs
    });
    done();
};
