import {APIError} from "@/src/utils/errors/APIError.js";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";

export class UnauthenticatedAPIError extends APIError {
    constructor(user: AnonymousUser | null) {
        if (user instanceof AnonymousUser) {
            super(401,
                "Authentication required",
                "Authentication credentials were not provided");
        }
        else {
            super(401,
                "Invalid credentials",
                "Invalid authentication credentials");
        }
    }
}
