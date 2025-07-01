import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {attributionController} from "@/src/controllers/AttributionController.js";

export const attributionRouter: FastifyPluginCallback = function (fastify, options, done) {

    fastify.get(`/attribution-sources/:attributionSourcesId/`, attributionController.getAttributionSource);
    done();
};
