import {FastifyPluginCallback} from "fastify/types/plugin.js";
import LanguageController from "@/src/controllers/LanguageController.js";
import {requiresAuth} from "@/src/middlewares/authMiddleware.js";

const languageRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/languages/`, LanguageController.getLanguages);
    fastify.get(`/users/:username/languages/`, LanguageController.getUserLanguages);
    fastify.post(`/users/:username/languages/`, {
        preHandler: requiresAuth,
        handler: LanguageController.addLanguageToUser
    });
    done();
};

export default languageRouter;