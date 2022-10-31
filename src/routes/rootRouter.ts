import {FastifyPluginCallback} from "fastify/types/plugin.js";
import userRouter from "./users.js";

const rootRouter: FastifyPluginCallback = function rootRouter(fastify, options, done) {
    fastify.register(userRouter);
    done();
};


export default rootRouter;