import {userController} from "@/src/controllers/UserController.js";
import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {requiresAuth} from "@/src/middlewares/requiresAuth.js";
import {requiresEmailConfirmed} from "@/src/middlewares/requiresEmailConfirmed.js";

export const userRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.post(`/users/`, userController.signUp);
    fastify.get(`/users/:username/`, userController.getUser);
    fastify.post(`/users/me/email/confirm/`, userController.confirmEmail);
    fastify.put(`/users/me/email/`, {preHandler: [requiresAuth], handler: userController.changeUserEmail});
    fastify.post(`/users/me/profile/`, {preHandler: [requiresAuth, requiresEmailConfirmed], handler: userController.createProfile});
    fastify.post(`/users/me/password/reset/`, userController.resetPassword);
    fastify.put(`/users/me/password/`, {preHandler: [requiresAuth], handler: userController.changeUserPassword});
    fastify.post(`/sessions/`, userController.login);
    fastify.delete(`/sessions/`, {preHandler: requiresAuth, handler: userController.logout});
    fastify.post(`/email-confirm-tokens/`, {preHandler: requiresAuth, handler: userController.createEmailConfirmToken});
    fastify.post(`/password-reset-tokens/`, userController.createPasswordResetToken);
    fastify.post(`/password-reset-tokens/verify/`, userController.verifyPasswordResetToken);

    done();
};
