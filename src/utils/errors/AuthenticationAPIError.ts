import {APIError} from "@/src/utils/errors/APIError.js";
import {StatusCodes} from "http-status-codes";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";

export class AuthenticationAPIError extends APIError {
    constructor(user: AnonymousUser | null) {
        if (user instanceof AnonymousUser) {
            super(StatusCodes.UNAUTHORIZED,
                "Authentication required",
                "Authentication credentials were not provided");
        }
        else {
            super(StatusCodes.UNAUTHORIZED,
                "Invalid credentials",
                "Invalid authentication credentials");
        }
    }
}
