import Fastify from "fastify";
import cors from "@fastify/cors";
import options from "@/src/mikro-orm.config.js";
import rootRouter from "@/src/routers/rootRouter.js";
import {errorHandler} from "@/src/middlewares/errorHandler.js";
import {MikroORM} from "@mikro-orm/postgresql";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

export const API_VERSION = 1;
export const API_ROOT = `/api/v${API_VERSION}`;

export const server = Fastify(
    {logger: {transport: {target: "@fastify/one-line-logger"}}}
);
//TODO replace with proper CORS
await server.register(cors, {});
await server.register(helmet, {global: true});
await server.register(rateLimit, {max: 100, timeWindow: "1m"});
export const orm = await MikroORM.init(options);
server.register(rootRouter, {prefix: API_ROOT});

server.setErrorHandler(errorHandler);
