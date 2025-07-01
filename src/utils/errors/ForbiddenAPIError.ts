import {APIError} from "@/src/utils/errors/APIError.js";

export class ForbiddenAPIError extends APIError {
    constructor(message?: string, details?: string) {
        super(403,
            message ?? `You are not allowed to perform this operation`,
            details ?? `You do not have access to this resource`);
    }
}
