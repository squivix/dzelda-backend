import {FastifyPluginCallback} from "fastify/types/plugin.js";
import LanguageController from "@/src/controllers/LanguageController.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";
import {requiresProfile} from "@/src/middlewares/requiresProfile.js";

export const languageRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/languages/`, LanguageController.getLanguages);
    fastify.get(`/users/:username/languages/`, LanguageController.getUserLanguages);
    fastify.post(`/users/:username/languages/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed, requiresProfile],
        handler: LanguageController.addLanguageToUser
    });
    fastify.patch(`/users/:username/languages/:languageCode/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed, requiresProfile],
        handler: LanguageController.updateUserLanguage
    });
    fastify.delete(`/users/:username/languages/:languageCode/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed, requiresProfile],
        handler: LanguageController.deleteUserLanguage
    });
    done();
};