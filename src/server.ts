import Fastify from "fastify";
import options from "@/src/mikro-orm.config.js";
import {PKDF2Hasher} from "@/src/utils/auth/PKDF2Hasher.js";
import rootRouter from "@/src/routers/rootRouter.js";
import {errorHandler} from "@/src/middlewares/errorHandler.js";
import {MikroORM} from "@mikro-orm/postgresql";

export const API_VERSION = 1;
export const API_ROOT = `/api/v${API_VERSION}`;
export const passwordHasher: PasswordHasher = new PKDF2Hasher();

export const server = Fastify({logger: {transport: {target: "@fastify/one-line-logger"}}});
export const orm = await MikroORM.init(options);

server.register(rootRouter, {prefix: API_ROOT});

server.setErrorHandler(errorHandler);

