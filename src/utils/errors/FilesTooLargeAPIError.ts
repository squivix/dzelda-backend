import {APIError} from "@/src/utils/errors/APIError.js";
import {StatusCodes} from "http-status-codes";
import {MAX_ALL_FILES_SIZE} from "@/src/middlewares/fileUploadMiddleWare.js";

export class FilesTooLargeAPIError extends APIError {
    constructor({field, maxSize}: { field?: string; maxSize?: number } = {}) {
        if (!maxSize)
            maxSize = MAX_ALL_FILES_SIZE;
        super(StatusCodes.REQUEST_TOO_LONG,
            `Files too large`,
            `Please make sure ${field ?? "your uploaded file(s)"} is/are less than or equal to ${(maxSize / 1024).toFixed(0)}KB in size`);
    }
}
