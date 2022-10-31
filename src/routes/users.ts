import UserController from "../controllers/UserController.js";
import {FastifyPluginCallback} from "fastify/types/plugin.js";

const userRouter: FastifyPluginCallback = function rootRouter(fastify, options, done) {
    fastify.post("/users/", UserController.signUp);
    done();
};

export default userRouter;