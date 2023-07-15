import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {requiresAuth} from "@/src/middlewares/authMiddleware.js";
import DictionaryController from "@/src/controllers/DictionaryController.js";

export const dictionaryRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/dictionaries/`, DictionaryController.getDictionaries);
    fastify.get(`/users/:username/dictionaries/`, {preHandler: requiresAuth, handler: DictionaryController.getUserDictionaries});
    done();
};