import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {meaningController} from "@/src/controllers/MeaningController.js";
import {requiresAuth} from "@/src/middlewares/authMiddleware.js";

export const meaningRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.post(`/meanings/`, {preHandler: requiresAuth, handler: meaningController.createMeaning});
    fastify.get(`/users/:username/meanings/`, {preHandler: requiresAuth, handler: meaningController.getUserMeanings});
    fastify.post(`/users/:username/meanings/`, {preHandler: requiresAuth, handler: meaningController.addMeaningToUser});
    fastify.delete(`/users/:username/meanings/:meaningId/`, {preHandler: requiresAuth, handler: meaningController.removeMeaningFromUser});
    done();
};