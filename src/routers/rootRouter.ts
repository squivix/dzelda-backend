import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {attachOrmEntityManagerMiddleware} from "@/src/middlewares/attachOrmEntityManagerMiddleware.js";
import {authMiddleware} from "@/src/middlewares/authMiddleware.js";
import {userRouter} from "@/src/routers/usersRouter.js";
import {languageRouter} from "@/src/routers/languagesRouter.js";
import {coursesRouter} from "@/src/routers/coursesRouter.js";
import {lessonsRouter} from "@/src/routers/lessonsRouter.js";
import FastifyFormidable from "fastify-formidable";
import {vocabRouter} from "@/src/routers/vocabRouter.js";
import {meaningRouter} from "@/src/routers/meaningRouter.js";
import {dictionaryRouter} from "@/src/routers/dictionaryRouter.js";

const rootRouter: FastifyPluginCallback = function rootRouter(fastify, options, done) {
    fastify.register(FastifyFormidable);
    fastify.decorateRequest("em", null);
    fastify.decorateRequest("user", null);
    fastify.addHook("preParsing", attachOrmEntityManagerMiddleware);
    fastify.addHook("preParsing", authMiddleware);


    fastify.register(userRouter);
    fastify.register(languageRouter);
    fastify.register(coursesRouter);
    fastify.register(lessonsRouter);
    fastify.register(vocabRouter);
    fastify.register(meaningRouter);
    fastify.register(dictionaryRouter);

    done();
};


export default rootRouter;