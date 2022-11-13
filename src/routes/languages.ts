import {FastifyPluginCallback} from "fastify/types/plugin.js";
import LanguageController from "@/src/controllers/LanguageController.js";

const languageRouter: FastifyPluginCallback = function rootRouter(fastify, options, done) {
    fastify.get(`/languages/`, LanguageController.getLanguages);
    fastify.get(`/users/:username/languages/`, LanguageController.getUserLanguages);
    done();
};

export default languageRouter;