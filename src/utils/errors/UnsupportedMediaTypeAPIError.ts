import {APIError} from "@/src/utils/errors/APIError.js";
import {StatusCodes} from "http-status-codes";

export class UnsupportedMediaTypeAPIError extends APIError {
    constructor(fileFiled: string, supportedMimeTypes: string[]) {
        super(StatusCodes.UNSUPPORTED_MEDIA_TYPE, `File type not allowed.`, `Please submit a file with one of the following mime types: ${supportedMimeTypes.join(",")}`);
    }
}
