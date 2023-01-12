import {preHandlerAsyncHookHandler, preParsingAsyncHookHandler} from "fastify/types/hooks.js";
import UserService from "@/src/services/UserService.js";
import {APIError} from "@/src/utils/errors/APIError.js";
import {StatusCodes} from "http-status-codes";


export const authMiddleware: preParsingAsyncHookHandler = async (request) => {
    const tokenArray = request.headers?.authorization?.split(" ");

    if (!tokenArray || tokenArray.length !== 2 || tokenArray[0] !== "Token" || !tokenArray[1])
        return;

    const token = tokenArray[1];

    const userService = new UserService(request.em);
    const user = await userService.getUserBySession(token);

    if (user)
        request.user = user;
};

export const requiresAuth: preHandlerAsyncHookHandler = async (request) => {
    const tokenArray = request.headers?.authorization?.split(" ");
    if (!tokenArray || tokenArray.length !== 2 || tokenArray[0] !== "Token" || !tokenArray[1]) {
        throw new APIError(
            StatusCodes.UNAUTHORIZED,
            "Authentication required",
            "Authentication credentials were not provided"
        );
    }
    if (!request.user) {
        throw new APIError(
            StatusCodes.UNAUTHORIZED,
            "Invalid credentials",
            "Invalid authentication credentials"
        );
    }
};