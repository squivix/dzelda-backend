import express from "express";
import {userRouter} from "./users.js";

export const rootRouter = express.Router();
rootRouter.use(userRouter);
