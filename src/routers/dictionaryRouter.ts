import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {dictionaryController} from "@/src/controllers/DictionaryController.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";

export const dictionaryRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/dictionaries/`, dictionaryController.getDictionaries);
    fastify.get(`/users/me/dictionaries/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: dictionaryController.getUserDictionaries
    });
    done();
};
