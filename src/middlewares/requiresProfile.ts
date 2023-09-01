import {preHandlerAsyncHookHandler} from "fastify/types/hooks.js";
import {User} from "@/src/models/entities/auth/User.js";
import {ForbiddenAPIError} from "@/src/utils/errors/ForbiddenAPIError.js";

export const requiresProfile: preHandlerAsyncHookHandler = async (request) => {
    if (!(request.user as User).profile)
        throw new ForbiddenAPIError("User has no profile");
}