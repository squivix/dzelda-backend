import {FastifyPluginCallback} from "fastify/types/plugin.js";
import LanguageController from "@/src/controllers/LanguageController.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";

export const languageRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/languages/`, LanguageController.getLanguages);
    fastify.get(`/users/:username/languages/`, LanguageController.getUserLanguages);
    fastify.post(`/users/me/languages/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: LanguageController.addLanguageToUser
    });
    fastify.patch(`/users/me/languages/:languageCode/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: LanguageController.updateUserLanguage
    });
    fastify.delete(`/users/me/languages/:languageCode/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: LanguageController.deleteUserLanguage
    });
    done();
};
