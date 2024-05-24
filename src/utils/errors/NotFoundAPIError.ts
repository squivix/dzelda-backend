import {APIError} from "@/src/utils/errors/APIError.js";
import {StatusCodes} from "http-status-codes";
import {toSentenceCase} from "dzelda-common";

export class NotFoundAPIError extends APIError {
    constructor(entity: string) {
        super(StatusCodes.NOT_FOUND,
            `${toSentenceCase(entity)} not found`,
            `No ${entity.toLowerCase()} matched your query.`);
    }
}
