import {preHandlerAsyncHookHandler} from "fastify/types/hooks.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {UnauthenticatedAPIError} from "@/src/utils/errors/UnauthenticatedAPIError.js";
import {ForbiddenAPIError} from "@/src/utils/errors/ForbiddenAPIError";

export const requiresAuth: preHandlerAsyncHookHandler = async (request) => {
    if (!request.user || request.user instanceof AnonymousUser)
        throw new UnauthenticatedAPIError(request.user);
}