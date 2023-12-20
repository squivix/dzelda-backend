import {getReasonPhrase, StatusCodes} from "http-status-codes";

export class APIError extends Error {
    statusCode: StatusCodes;
    message: string;
    details: string | undefined;
    fields: { [field: string]: string } | undefined;

    constructor(statusCode: StatusCodes, message: string, details?: string, fields?: { [field: string]: string }) {
        super();
        this.statusCode = statusCode;
        this.message = message;
        this.details = details;
        this.fields = fields;
    }

    // noinspection JSUnusedGlobalSymbols
    toJSON() {
        return {
            code: this.statusCode,
            status: getReasonPhrase(this.statusCode),
            message: this.message,
            details: this.details,
            fields: this.fields
        };
    }

}
