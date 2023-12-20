import {APIError} from "@/src/utils/errors/APIError.js";
import {StatusCodes} from "http-status-codes";

export class UnsupportedFileTypeAPIError extends APIError {
    constructor(field: string, supportedMimeTypes: string[]) {
        super(StatusCodes.UNSUPPORTED_MEDIA_TYPE,
            `File type not allowed.`,
            `Please submit a file with one of the following mime types: ${supportedMimeTypes.join(",")}`,
            {[field]: "File type not allowed"});
    }
}
