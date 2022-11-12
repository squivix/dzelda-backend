import Fastify from "fastify";
import {MikroORM} from "@mikro-orm/core";
import options from "./mikro-orm.config.js";
import {PKDF2Hasher} from "./utils/auth/PKDF2Hasher.js";
import rootRouter from "./routes/rootRouter.js";
import errorHandler from "./middlewares/errorHandler.js";

export const API_VERSION = 1;
export const API_ROOT = `/api/v${API_VERSION}`;
export const passwordHasher: PasswordHasher = new PKDF2Hasher();
export const server = Fastify({logger: {transport: {target: "@fastify/one-line-logger"}}});
export const orm = await MikroORM.init(options);

server.register(rootRouter, {prefix: API_ROOT});

server.setErrorHandler(errorHandler);

