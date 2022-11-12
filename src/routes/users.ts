import UserController from "@/src/controllers/UserController.js";
import {FastifyPluginCallback} from "fastify/types/plugin.js";

const userRouter: FastifyPluginCallback = function rootRouter(fastify, options, done) {
    fastify.post(`/users/`, UserController.signUp);
    fastify.post(`/sessions/`, UserController.login);
    done();
};

export default userRouter;