import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {textController} from "@/src/controllers/TextController.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";
import {collectionController} from "@/src/controllers/CollectionController.js";

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
    fastify.get(`/users/me/texts/bookmarked/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: textController.getUserBookmarkedTexts,
    });
    fastify.post(`/users/me/texts/bookmarked/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: textController.addTextToUserBookmarks,
    });
    fastify.delete(`/users/me/texts/bookmarked/:textId/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: textController.removeTextFromUserBookmarks,
    });
    fastify.get(`/users/me/texts/hidden/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: textController.getUserHiddenTexts,
    });
    fastify.post(`/users/me/texts/hidden/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: textController.hideTextForUser,
    });
    fastify.delete(`/users/me/texts/hidden/:textId/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: textController.unhideTextForUser,
    });
    fastify.post(`/texts/:textId/reports/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: textController.reportText,
    });
    done();
};
