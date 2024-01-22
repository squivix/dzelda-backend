import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {languageController} from "@/src/controllers/LanguageController.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";

export const languageRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/languages/`, languageController.getLanguages);
    fastify.get(`/users/:username/languages/`, languageController.getUserLanguages);
    fastify.post(`/users/me/languages/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: languageController.addLanguageToUser
    });
    fastify.patch(`/users/me/languages/:languageCode/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: languageController.updateUserLanguage
    });
    fastify.delete(`/users/me/languages/:languageCode/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: languageController.deleteUserLanguage
    });
    fastify.delete(`/users/me/languages/:languageCode/progress/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: languageController.resetUserLanguageProgress
    });
    done();
};
