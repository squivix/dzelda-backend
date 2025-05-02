import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {meaningController} from "@/src/controllers/MeaningController.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";
import {requiresUnbannedAccount} from "@/src/middlewares/requiresUnbannedAccount.js";

export const meaningRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.post(`/meanings/`, {preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed], handler: meaningController.createMeaning});
    fastify.get(`/users/me/meanings/`, {
        preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed],
        handler: meaningController.getUserMeanings
    });
    fastify.post(`/users/me/meanings/`, {
        preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed],
        handler: meaningController.addMeaningToUser
    });
    fastify.delete(`/users/me/meanings/:meaningId/`, {
        preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed],
        handler: meaningController.removeMeaningFromUser
    });
    done();
};
