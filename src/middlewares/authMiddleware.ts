import {preHandlerAsyncHookHandler, preParsingAsyncHookHandler} from "fastify/types/hooks.js";
import UserService from "@/src/services/UserService.js";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";
import {UnauthenticatedAPIError} from "@/src/utils/errors/UnauthenticatedAPIError.js";

const BEARER_TOKEN_PREFIX = "Bearer"
export const authMiddleware: preParsingAsyncHookHandler = async (request) => {
    const tokenArray = request.headers?.authorization?.split(" ");

    if (!tokenArray || tokenArray.length !== 2 || tokenArray[0] !== BEARER_TOKEN_PREFIX || !tokenArray[1]) {
        request.user = new AnonymousUser();
        return;
    }

    const token = tokenArray[1];

    const userService = new UserService(request.em);
    const user = await userService.getUserBySession(token);

    if (user)
        request.user = user;
};

export const requiresAuth: preHandlerAsyncHookHandler = async (request) => {
    if (!request.user || request.user instanceof AnonymousUser)
        throw new UnauthenticatedAPIError(request.user);
}