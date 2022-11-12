import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {attachOrmEntityManager} from "../middlewares/attachOrmEntityManager.js";
import {authMiddleware} from "../middlewares/authMiddleware.js";
import userRouter from "./users.js";
import profileRouter from "./profiles.js";
import languageRouter from "./languages.js";

const rootRouter: FastifyPluginCallback = function rootRouter(fastify, options, done) {
    fastify.decorateRequest("em", null);
    fastify.decorateRequest("user", null);
    fastify.addHook("preParsing", attachOrmEntityManager);
    fastify.addHook("preParsing", authMiddleware);

    fastify.register(userRouter);
    fastify.register(profileRouter);
    fastify.register(languageRouter);

    done();
};


export default rootRouter;