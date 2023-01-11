import {APIError} from "@/src/utils/errors/APIError.js";
import {StatusCodes} from "http-status-codes";

export class UnauthorizedAPIError extends APIError {
    constructor() {
        super(StatusCodes.FORBIDDEN,
            `Your are not allowed to perform this operation`,
            `You do not have access to this resource`);
    }
}
