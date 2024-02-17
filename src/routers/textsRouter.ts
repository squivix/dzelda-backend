import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {textController} from "@/src/controllers/TextController.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";

export const textsRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/texts/`, textController.getTexts);
    fastify.post(`/texts/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: textController.createText
    });
    fastify.get(`/texts/:textId/`, textController.getText);
    fastify.patch(`/texts/:textId/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: textController.updateText
    });
    fastify.delete(`/texts/:textId/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: textController.deleteText
    });
    fastify.get(`/collections/:collectionId/texts/:textId/next/`, textController.getNextTextInCollection);
    fastify.get(`/users/me/texts/history/`, {preHandler: [requiresAuth, requiresEmailConfirmed], handler: textController.getUserTextsHistory});
    fastify.post(`/users/me/texts/history/`, {preHandler: [requiresAuth, requiresEmailConfirmed], handler: textController.addTextToUserHistory});
    done();
};
