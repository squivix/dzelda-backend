import Fastify from "fastify";
import cors from "@fastify/cors";
import options from "@/src/mikro-orm.config.js";
import rootRouter from "@/src/routers/rootRouter.js";
import {errorHandler} from "@/src/middlewares/errorHandler.js";
import {MikroORM} from "@mikro-orm/postgresql";
import helmet from "@fastify/helmet";
import {DOMAIN_NAME} from "@/src/constants.js";
import {escapeRegExp} from "@/src/utils/utils.js";
import process from "process";
import rateLimit from "@fastify/rate-limit";


export const API_VERSION = 1;
export const API_ROOT = `/api/v${API_VERSION}`;
export const server = Fastify(
    {logger: {transport: {target: "@fastify/one-line-logger"}}}
);

await server.register(cors, process.env.NODE_ENV == "prod" ? {
    origin: new RegExp(`${escapeRegExp(DOMAIN_NAME)}$`),
    methods: ["GET", "PUT", "POST", "DELETE", "PATCH", "HEAD", "OPTIONS", "CONNECT", "TRACE"],
} : {});

await server.register(helmet, {global: true});
await server.register(rateLimit, {max: 200, timeWindow: "1 minute"});
export const orm = await MikroORM.init(options);
server.register(rootRouter, {prefix: API_ROOT});

server.setErrorHandler(errorHandler);
