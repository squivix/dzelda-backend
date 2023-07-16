import {APIError} from "@/src/utils/errors/APIError.js";
import {StatusCodes} from "http-status-codes";
import {MAX_TOTAL_FILE_UPLOAD_SIZE} from "@/src/middlewares/fileUploadMiddleware.js";

export class FilesTooLargeAPIError extends APIError {
    constructor({field, maxSizeInKb}: { field?: string; maxSizeInKb?: number } = {}) {
        if (!maxSizeInKb)
            maxSizeInKb = MAX_TOTAL_FILE_UPLOAD_SIZE;
        super(StatusCodes.REQUEST_TOO_LONG,
            `File(s) too large`,
            `Please make sure ${field ?? "your uploaded file(s)"} is/are less than or equal to ${maxSizeInKb}KB in size`);
    }
}
