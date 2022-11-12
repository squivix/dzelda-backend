import {FastifyPluginCallback} from "fastify/types/plugin.js";
import LanguageController from "@/src/controllers/LanguageController.js";

const languageRouter: FastifyPluginCallback = function rootRouter(fastify, options, done) {
    fastify.get(`/languages/`, LanguageController.getLanguages);
    done();
};

export default languageRouter;