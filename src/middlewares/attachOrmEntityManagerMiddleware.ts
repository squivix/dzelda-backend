import {preParsingAsyncHookHandler} from "fastify/types/hooks.js";
import {orm} from "@/src/server.js";


export const attachOrmEntityManagerMiddleware: preParsingAsyncHookHandler = async (request) => {
    request.em = orm.em.fork();
};
