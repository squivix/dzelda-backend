import {APIError} from "@/src/utils/errors/APIError.js";

export class ValidationAPIError extends APIError {
    constructor(fields: { [field: string]: string }) {
        super(400,
            // TODO show invalid or missing
            `Invalid fields: ${Object.keys(fields).join(", ")}`,
            `Invalid fields:\n${Object.entries(fields).map(([field, message]) => `${field}: ${message}`).join("\n")}`, fields);
    }
}
