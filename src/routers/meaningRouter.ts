import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {meaningController} from "@/src/controllers/MeaningController.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";

export const meaningRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.post(`/meanings/`, {preHandler: [requiresAuth, requiresEmailConfirmed], handler: meaningController.createMeaning});
    fastify.get(`/users/:username/meanings/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: meaningController.getUserMeanings
    });
    fastify.post(`/users/:username/meanings/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: meaningController.addMeaningToUser
    });
    fastify.delete(`/users/:username/meanings/:meaningId/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: meaningController.removeMeaningFromUser
    });
    done();
};
