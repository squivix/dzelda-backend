import Fastify from "fastify";
import cors from "@fastify/cors";
import options from "@/src/mikro-orm.config.js";
import rootRouter from "@/src/routers/rootRouter.js";
import {errorHandler} from "@/src/middlewares/errorHandler.js";
import {MikroORM} from "@mikro-orm/postgresql";

export const API_VERSION = 1;
export const API_ROOT = `/api/v${API_VERSION}`;

export const server = Fastify(
    // {logger: {transport: {target: "@fastify/one-line-logger"}}}
);
await server.register(cors, {});
export const orm = await MikroORM.init(options);
server.register(rootRouter, {prefix: API_ROOT});

server.setErrorHandler(errorHandler);
