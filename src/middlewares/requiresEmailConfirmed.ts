import {preHandlerAsyncHookHandler} from "fastify/types/hooks.js";
import {User} from "@/src/models/entities/auth/User.js";
import {ForbiddenAPIError} from "@/src/utils/errors/ForbiddenAPIError.js";

export const requiresEmailConfirmed: preHandlerAsyncHookHandler = async (request) => {
    if (!(request.user as User).isEmailConfirmed)
        throw new ForbiddenAPIError("Email address not confirmed");
};
