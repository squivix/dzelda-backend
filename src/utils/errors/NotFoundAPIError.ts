import {APIError} from "./APIError.js";
import {StatusCodes} from "http-status-codes";
import {toCapitalizedCase} from "../utils.js";

export class NotFoundAPIError extends APIError {
    constructor(entity: string) {
        super(StatusCodes.NOT_FOUND,
            `${toCapitalizedCase(entity)} not found`,
            `No ${entity.toLowerCase()} matched your query.`);
    }
}
