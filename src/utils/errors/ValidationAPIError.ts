import {APIError} from "@/src/utils/errors/APIError.js";
import {StatusCodes} from "http-status-codes";

export type FieldsObject = { [field: string]: string }

export class ValidationAPIError extends APIError {
    fields: FieldsObject;

    constructor(fields: FieldsObject) {
        super(StatusCodes.BAD_REQUEST,
            // TODO show invalid or missing
            `Invalid fields: ${Object.keys(fields).join(", ")}`,
            `Invalid fields:\n${Object.entries(fields).map(([field, message]) => `${field}: ${message}`).join("\n")}`);
        this.fields = fields;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            fields: this.fields
        };
    }
}
