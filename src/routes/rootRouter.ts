import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {attachOrmEntityManager} from "@/src/middlewares/attachOrmEntityManager.js";
import {authMiddleware} from "@/src/middlewares/authMiddleware.js";
import userRouter from "@/src/routes/users.js";
import profileRouter from "@/src/routes/profiles.js";
import languageRouter from "@/src/routes/languages.js";

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