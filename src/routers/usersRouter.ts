import {userController} from "@/src/controllers/UserController.js";
import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";
import {requiresUnbannedAccount} from "@/src/middlewares/requiresUnbannedAccount.js";

export const userRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.post(`/users/`, userController.signUp);
    fastify.get(`/users/:username/`, userController.getUser);
    fastify.delete(`/users/me/`, {preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed], handler: userController.deleteAccount});
    fastify.post(`/users/me/email/confirm/`, userController.confirmEmail);
    fastify.post(`/users/me/password/reset/`, {handler: userController.resetPassword, config: {rateLimit: {max: 10, timeWindow: "1 minute"}}});
    fastify.put(`/users/me/password/`, {
        preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed],
        handler: userController.changeUserPassword,
        config: {rateLimit: {max: 10, timeWindow: "1 minute"}}
    });
    fastify.post(`/sessions/`, userController.login);
    fastify.delete(`/sessions/`, {preHandler: requiresAuth, handler: userController.logout});
    fastify.put(`/users/me/email/`, {preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed], handler: userController.changeUserEmail});
    fastify.post(`/email-confirm-tokens/`, {preHandler: [requiresAuth, requiresUnbannedAccount], handler: userController.requestEmailConfirmation});
    fastify.post(`/password-reset-tokens/`, {handler: userController.requestPasswordReset, config: {rateLimit: {max: 10, timeWindow: "1 minute"}}});
    fastify.post(`/password-reset-tokens/verify/`, {handler: userController.verifyPasswordResetToken, config: {rateLimit: {max: 10, timeWindow: "1 minute"}}});
    fastify.put(`/users/me/profile/`, {
        preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed],
        handler: userController.updateUserProfile,
    });
    fastify.post(`/file-upload-requests/`, {handler: userController.generateFileUploadPresignedUrl, preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed]});
    fastify.get(`/users/me/notifications/`, {preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed], handler: userController.getUserNotifications});
    fastify.delete(`/users/me/notifications/:notificationId/`, {preHandler: [requiresAuth, requiresUnbannedAccount, requiresEmailConfirmed], handler: userController.deleteUserNotification});


    done();
};
