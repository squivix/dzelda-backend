import {preHandlerAsyncHookHandler, preParsingAsyncHookHandler} from "fastify/types/hooks.js";
import UserService from "@/src/services/UserService.js";


export const authMiddleware: preParsingAsyncHookHandler = async (request, reply) => {
    const tokenArray = request.headers?.authorization?.split(" ");

    if (!tokenArray || tokenArray.length !== 2 || tokenArray[0] !== "Token" || !tokenArray[1])
        return;

    const token = tokenArray[1];

    const userService = new UserService(request.em);
    const user = await userService.getUserBySession(token);

    if (user)
        request.user = user;
};

export const requiresAuth: preHandlerAsyncHookHandler = async (request, reply) => {
    const tokenArray = request.headers?.authorization?.split(" ");
    if (!tokenArray || tokenArray.length !== 2 || tokenArray[0] !== "Token" || !tokenArray[1]) {
        reply.status(401).send({details: "Authentication credentials were not provided"});
        return;
    }
    if (!request.user)
        reply.status(401).send({details: "Invalid credentials"});
};