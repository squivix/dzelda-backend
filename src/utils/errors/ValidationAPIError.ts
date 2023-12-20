import {APIError} from "@/src/utils/errors/APIError.js";
import {StatusCodes} from "http-status-codes";

export class ValidationAPIError extends APIError {
    constructor(fields: { [field: string]: string }) {
        super(StatusCodes.BAD_REQUEST,
            // TODO show invalid or missing
            `Invalid fields: ${Object.keys(fields).join(", ")}`,
            `Invalid fields:\n${Object.entries(fields).map(([field, message]) => `${field}: ${message}`).join("\n")}`, fields);
    }
}
