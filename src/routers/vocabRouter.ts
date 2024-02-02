import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {vocabController} from "@/src/controllers/VocabController.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";

export const vocabRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.post(`/vocabs/`, {preHandler: [requiresAuth, requiresEmailConfirmed], handler: vocabController.createVocab});
    fastify.get(`/vocabs/`, vocabController.getVocabs);
    fastify.get(`/vocabs/:vocabId/human-pronunciations/`, vocabController.getVocabHumanPronunciations);
    fastify.get(`/users/me/vocabs/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: vocabController.getUserVocabs
    });
    fastify.get(`/users/:username/vocabs/saved/count/`, vocabController.getUserSavedVocabsCount);
    fastify.get(`/users/:username/vocabs/saved/count/time-series/`, vocabController.getUserSavedVocabsCountTimeSeries);

    fastify.post(`/users/me/vocabs/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: vocabController.addVocabToUser
    });
    fastify.get(`/users/me/vocabs/:vocabId/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: vocabController.getUserVocab
    });
    fastify.patch(`/users/me/vocabs/:vocabId/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: vocabController.updateUserVocab
    });
    fastify.delete(`/users/me/vocabs/:vocabId/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: vocabController.deleteUserVocab
    });
    fastify.get(`/lessons/:lessonId/vocabs/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: vocabController.getLessonVocabs
    });
    done();
};
