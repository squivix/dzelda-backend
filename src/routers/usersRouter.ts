import {userController} from "@/src/controllers/UserController.js";
import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {requiresAuth} from "@/src/middlewares/authMiddleware.js";

export const userRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.post(`/users/`, userController.signUp);
    fastify.get(`/users/:username/`, userController.getUser);
    fastify.post(`/sessions/`, userController.login);
    fastify.delete(`/sessions/`, {preHandler: requiresAuth, handler: userController.logout});
    fastify.post(`/password-reset-tokens/`, userController.createPasswordResetToken);
    fastify.post(`/password-reset-tokens/validate/`, userController.validatePasswordResetToken);
    fastify.post(`/users/me/passwords/`, userController.resetPassword);
    // fastify.put(`/users/me/passwords/`, userController.updatePassword);

    done();
};
