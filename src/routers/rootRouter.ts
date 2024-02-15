import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {attachOrmEntityManagerMiddleware} from "@/src/middlewares/attachOrmEntityManagerMiddleware.js";
import {authMiddleware} from "@/src/middlewares/authMiddleware.js";
import {userRouter} from "@/src/routers/usersRouter.js";
import {languageRouter} from "@/src/routers/languagesRouter.js";
import {collectionsRouter} from "@/src/routers/collectionsRouter.js";
import {lessonsRouter} from "@/src/routers/lessonsRouter.js";
import {vocabRouter} from "@/src/routers/vocabRouter.js";
import {meaningRouter} from "@/src/routers/meaningRouter.js";
import {dictionaryRouter} from "@/src/routers/dictionaryRouter.js";
import {pronunciationRouter} from "@/src/routers/pronunciationRouter.js";

//TODO return 400 for invalid json not 500
const rootRouter: FastifyPluginCallback = function rootRouter(fastify, options, done) {
    fastify.decorateRequest("em", null);
    fastify.decorateRequest("user", null);
    fastify.addHook("preParsing", attachOrmEntityManagerMiddleware);
    fastify.addHook("preParsing", authMiddleware);

    fastify.register(userRouter);
    fastify.register(languageRouter);
    fastify.register(collectionsRouter);
    fastify.register(lessonsRouter);
    fastify.register(vocabRouter);
    fastify.register(pronunciationRouter);
    fastify.register(meaningRouter);
    fastify.register(dictionaryRouter);

    done();
};


export default rootRouter;
