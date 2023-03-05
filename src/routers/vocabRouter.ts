import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {vocabController} from "@/src/controllers/VocabController.js";
import {requiresAuth} from "@/src/middlewares/authMiddleware.js";

export const vocabRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.post(`/vocabs/`, {preHandler: requiresAuth, handler: vocabController.createVocab});
    fastify.get(`/vocabs/`, vocabController.getVocabs);
    fastify.get(`/users/:username/vocabs/`, {preHandler: requiresAuth, handler: vocabController.getUserVocabs});
    fastify.get(`/users/:username/vocabs/:vocabId/`, {preHandler: requiresAuth, handler: vocabController.getUserVocab});
    done();
};