import {userController} from "@/src/controllers/UserController.js";
import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {requiresAuth} from "@/src/middlewares/authMiddleware.js";

export const userRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.post(`/users/`, userController.signUp);
    fastify.get(`/users/:username/`, userController.getUser);
    fastify.post(`/sessions/`, userController.login);
    fastify.delete(`/sessions/`, {preHandler: requiresAuth, handler: userController.logout});

    done();
};