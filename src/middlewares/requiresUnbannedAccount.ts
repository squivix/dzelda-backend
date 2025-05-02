import {preHandlerAsyncHookHandler} from "fastify/types/hooks.js";
import {User} from "@/src/models/entities/auth/User.js";
import {ForbiddenAPIError} from "@/src/utils/errors/ForbiddenAPIError.js";

export const requiresUnbannedAccount: preHandlerAsyncHookHandler = async (request) => {
    if ((request.user as User).isBanned)
        throw new ForbiddenAPIError("User account banned");
};
