import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {attachOrmEntityManagerMiddleware} from "@/src/middlewares/attachOrmEntityManagerMiddleware.js";
import {authMiddleware} from "@/src/middlewares/authMiddleware.js";
import {userRouter} from "@/src/routers/usersRouter.js";
import {languageRouter} from "@/src/routers/languagesRouter.js";
import {coursesRouter} from "@/src/routers/coursesRouter.js";
import {lessonsRouter} from "@/src/routers/lessonsRouter.js";
import FastifyFormidable from "fastify-formidable";

const rootRouter: FastifyPluginCallback = function rootRouter(fastify, options, done) {
    fastify.register(FastifyFormidable)
    fastify.decorateRequest("em", null);
    fastify.decorateRequest("user", null);
    fastify.addHook("preParsing", attachOrmEntityManagerMiddleware);
    fastify.addHook("preParsing", authMiddleware);


    fastify.register(userRouter);
    fastify.register(languageRouter);
    fastify.register(coursesRouter);
    fastify.register(lessonsRouter);

    done();
};


export default rootRouter;