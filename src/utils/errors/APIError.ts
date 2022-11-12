import {getReasonPhrase, StatusCodes} from "http-status-codes";

export class APIError extends Error {
    statusCode: StatusCodes;
    message: string;
    details: string | undefined;

    //TODO standardize or remove ids
    constructor(statusCode: StatusCodes, message: string, details?: string) {
        super();
        this.statusCode = statusCode;
        this.message = message;
        this.details = details;
    }

    // noinspection JSUnusedGlobalSymbols
    toJSON() {
        return {
            code: this.statusCode,
            status: getReasonPhrase(this.statusCode),
            message: this.message,
            details: this.details,
        };
    }

}