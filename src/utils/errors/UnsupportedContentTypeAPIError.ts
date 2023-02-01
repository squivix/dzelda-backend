import {APIError} from "@/src/utils/errors/APIError.js";
import {StatusCodes} from "http-status-codes";

export class UnsupportedContentTypeAPIError extends APIError {
    constructor(expectedContentType: string) {
        super(StatusCodes.UNSUPPORTED_MEDIA_TYPE, `Content type not allowed.`, `Please submit a request with content type: ${expectedContentType}`);
    }
}
