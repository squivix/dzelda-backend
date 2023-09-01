import {APIError} from "@/src/utils/errors/APIError.js";
import {StatusCodes} from "http-status-codes";

export class ForbiddenAPIError extends APIError {
    constructor(message?: string, details?: string) {
        super(StatusCodes.FORBIDDEN,
            message ?? `Your are not allowed to perform this operation`,
            details ?? `You do not have access to this resource`);
    }
}
