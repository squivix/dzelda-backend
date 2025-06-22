import {preParsingAsyncHookHandler} from "fastify/types/hooks.js";
import {UserService} from "@/src/services/UserService.js";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";

const BEARER_TOKEN_PREFIX = "Bearer"
export const authMiddleware: preParsingAsyncHookHandler = async (request) => {
    const tokenArray = request.headers?.authorization?.split(" ");

    if (!tokenArray || tokenArray.length !== 2 || tokenArray[0] !== BEARER_TOKEN_PREFIX || !tokenArray[1]) {
        request.user = new AnonymousUser();
        request.isLoggedIn = false;
    } else {
        const token = tokenArray[1];

        const userService = new UserService(request.em);
        const session = await userService.getLoginSession(token);

        if (session) {
            request.session = session;
            request.user = session.user;
        }
    }
    request.isLoggedIn = !!request.user && !(request.user instanceof AnonymousUser);
};

