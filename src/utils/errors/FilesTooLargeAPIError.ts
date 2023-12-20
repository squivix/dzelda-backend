import {APIError} from "@/src/utils/errors/APIError.js";
import {StatusCodes} from "http-status-codes";
import {MAX_TOTAL_FILE_UPLOAD_SIZE_IN_BYTES} from "@/src/constants.js";
import prettyBytes from "pretty-bytes";

export class FilesTooLargeAPIError extends APIError {
    constructor({field, maxSizeInBytes}: { field: string; maxSizeInBytes: number }) {
        if (!maxSizeInBytes)
            maxSizeInBytes = MAX_TOTAL_FILE_UPLOAD_SIZE_IN_BYTES;
        super(StatusCodes.REQUEST_TOO_LONG,
            `File(s) too big`,
            `Please make sure ${field ?? "your uploaded file(s)"} is/are less than or equal to ${prettyBytes(maxSizeInBytes)} in size`,
            {[field]: "File too big"});
    }

}
