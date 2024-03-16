import Fastify from "fastify";
import cors from "@fastify/cors";
import options from "@/src/mikro-orm.config.js";
import rootRouter from "@/src/routers/rootRouter.js";
import {errorHandler} from "@/src/middlewares/errorHandler.js";
import {MikroORM} from "@mikro-orm/postgresql";
import helmet from "@fastify/helmet";
import path from "path";
import fastifyStatic from "@fastify/static";
import {fileURLToPath} from "url";
import {DOMAIN_NAME} from "@/src/constants.js";
import {escapeRegExp} from "@/src/utils/utils.js";
import process from "process";
import rateLimit from "@fastify/rate-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const API_VERSION = 1;
export const API_ROOT = `/api/v${API_VERSION}`;
export const server = Fastify(
    {logger: {transport: {target: "@fastify/one-line-logger"}}}
);
server.register(fastifyStatic, {
    root: path.join(__dirname, "..", "public"),
    prefix: "/public/"
});

await server.register(cors, process.env.NODE_ENV == "prod" ? {
    origin: new RegExp(`${escapeRegExp(DOMAIN_NAME)}$`),
    methods: ["GET", "PUT", "POST", "DELETE", "PATCH", "HEAD", "OPTIONS", "CONNECT", "TRACE"],
} : undefined);

await server.register(helmet, {global: true});
await server.register(rateLimit, {max: 100, timeWindow: "1m"});
export const orm = await MikroORM.init(options);
server.register(rootRouter, {prefix: API_ROOT});

server.setErrorHandler(errorHandler);
