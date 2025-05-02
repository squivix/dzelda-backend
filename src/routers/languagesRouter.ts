import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {languageController} from "@/src/controllers/LanguageController.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";
import {requiresUnbannedAccount} from "@/src/middlewares/requiresUnbannedAccount";

export const languageRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/languages/`, languageController.getLanguages);
    fastify.get(`/users/:username/languages/`, languageController.getUserLanguages);
    fastify.post(`/users/me/languages/`, {
        preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed],
        handler: languageController.addLanguageToUser
    });
    fastify.patch(`/users/me/languages/:languageCode/`, {
        preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed],
        handler: languageController.updateUserLanguage
    });
    fastify.delete(`/users/me/languages/:languageCode/`, {
        preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed],
        handler: languageController.deleteUserLanguage
    });
    fastify.delete(`/users/me/languages/:languageCode/progress/`, {
        preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed],
        handler: languageController.resetUserLanguageProgress
    });
    fastify.get(`/translation-languages/`, languageController.getTranslationLanguages);
    done();
};
