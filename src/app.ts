// import express from 'express';
import express, {json} from "express";
import {MikroORM} from "@mikro-orm/core";
import options from "./mikro-orm.config.js";
import MikroORMRequestContext from "./middlewares/MikroORMRequestContext.js";
import {rootRouter} from "./routes/rootRouter.js";
import morgan from "morgan";
import ErrorHandler from "./middlewares/ErrorHandler.js";
import {PKDF2Hasher} from "./utils/auth/PKDF2Hasher.js";

export const API_VERSION = 1;
export const API_ROOT = `/api/v${API_VERSION}`;

export const app = express();
export const orm = await MikroORM.init(options);

//Middleware
app.use(morgan("tiny"));
app.use(json());
app.use(MikroORMRequestContext);
app.use(API_ROOT, rootRouter);
app.use(ErrorHandler);


export const passwordHasher: PasswordHasher = new PKDF2Hasher();