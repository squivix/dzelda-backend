import {userController} from "@/src/controllers/UserController.js";
import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";

// config: {rateLimit: {max: 10, timeWindow: "1m"}}
export const userRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.post(`/users/`, userController.signUp);
    fastify.get(`/users/:username/`, userController.getUser);
    fastify.delete(`/users/me/`, {preHandler: [requiresAuth, requiresEmailConfirmed], handler: userController.deleteAccount});
    fastify.post(`/users/me/email/confirm/`, userController.confirmEmail);
    fastify.post(`/users/me/password/reset/`, {handler: userController.resetPassword, config: {rateLimit: {max: 10, timeWindow: "1m"}}});
    fastify.put(`/users/me/password/`, {preHandler: [requiresAuth, requiresEmailConfirmed], handler: userController.changeUserPassword, config: {rateLimit: {max: 10, timeWindow: "1m"}}});
    fastify.post(`/sessions/`, userController.login);
    fastify.delete(`/sessions/`, {preHandler: requiresAuth, handler: userController.logout});
    fastify.put(`/users/me/email/`, {preHandler: [requiresAuth, requiresEmailConfirmed], handler: userController.changeUserEmail});
    fastify.post(`/email-confirm-tokens/`, {preHandler: requiresAuth, handler: userController.requestEmailConfirmation});
    fastify.post(`/password-reset-tokens/`, {handler: userController.requestPasswordReset, config: {rateLimit: {max: 10, timeWindow: "1m"}}});
    fastify.post(`/password-reset-tokens/verify/`, {handler: userController.verifyPasswordResetToken, config: {rateLimit: {max: 10, timeWindow: "1m"}}});
    fastify.put(`/users/me/profile/`, {
        preHandler: [requiresAuth, requiresEmailConfirmed],
        handler: userController.updateUserProfile,
    });
    fastify.post(`/file-upload-requests/`, {handler: userController.generateFileUploadPresignedUrl, preHandler: [requiresAuth, requiresEmailConfirmed]});
    fastify.get(`/users/me/notifications/`, {preHandler: [requiresAuth, requiresEmailConfirmed], handler: userController.getUserNotifications});
    fastify.delete(`/users/me/notifications/:notificationId/`, {preHandler: [requiresAuth, requiresEmailConfirmed], handler: userController.deleteUserNotification});


    done();
};
