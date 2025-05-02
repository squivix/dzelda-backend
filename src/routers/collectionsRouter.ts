import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {collectionController} from "@/src/controllers/CollectionController.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";
import {mebiBytes} from "dzelda-common";
import {requiresUnbannedAccount} from "@/src/middlewares/requiresUnbannedAccount";

export const collectionsRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/collections/`, collectionController.getCollections);
    fastify.post(`/collections/`, {
        bodyLimit: mebiBytes(5),
        preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed],
        handler: collectionController.createCollection
    });

    fastify.get(`/collections/:collectionId/`, collectionController.getCollection);

    fastify.put(`/collections/:collectionId/`, {
        preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed],
        handler: collectionController.updateCollection,
    });

    fastify.delete(`/collections/:collectionId/`, {
        preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed],
        handler: collectionController.deleteCollection,
    });

    fastify.get(`/users/me/collections/bookmarked/`, {
        preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed],
        handler: collectionController.getUserBookmarkedCollections,
    });

    fastify.post(`/users/me/collections/bookmarked/`, {
        preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed],
        handler: collectionController.addCollectionToUserBookmarks,
    });

    fastify.delete(`/users/me/collections/bookmarked/:collectionId/`, {
        preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed],
        handler: collectionController.removeCollectionFromUserBookmarks,
    });

    done();
};
