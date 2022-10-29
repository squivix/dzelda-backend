import express from "express";
import UserController from "../controllers/UserController.js";

export const userRouter = express.Router();
userRouter.post("/users/", UserController.signUp);
