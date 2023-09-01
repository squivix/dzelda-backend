import {FastifyPluginCallback} from "fastify/types/plugin.js";
import DictionaryController from "@/src/controllers/DictionaryController.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";
import {requiresProfile} from "@/src/middlewares/requiresProfile.js";

export const dictionaryRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/dictionaries/`, DictionaryController.getDictionaries);
    fastify.get(`/users/:username/dictionaries/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed, requiresProfile],
        handler: DictionaryController.getUserDictionaries
    });
    done();
};