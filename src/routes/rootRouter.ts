import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {attachOrmEntityManagerMiddleware} from "@/src/middlewares/attachOrmEntityManagerMiddleware.js";
import {authMiddleware} from "@/src/middlewares/authMiddleware.js";
import {userRouter} from "@/src/routes/usersRouter.js";
import {profileRouter} from "@/src/routes/profilesRouter.js";
import {languageRouter} from "@/src/routes/languagesRouter.js";
import {coursesRouter} from "@/src/routes/coursesRouter.js";

const rootRouter: FastifyPluginCallback = function rootRouter(fastify, options, done) {
    fastify.decorateRequest("em", null);
    fastify.decorateRequest("user", null);
    fastify.addHook("preParsing", attachOrmEntityManagerMiddleware);
    fastify.addHook("preParsing", authMiddleware);

    fastify.register(userRouter);
    fastify.register(profileRouter);
    fastify.register(languageRouter);
    fastify.register(coursesRouter);

    done();
};


export default rootRouter;