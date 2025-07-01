import {APIError} from "@/src/utils/errors/APIError.js";
import {toSentenceCase} from "dzelda-common";

export class NotFoundAPIError extends APIError {
    constructor(entity: string) {
        super(404,
            `${toSentenceCase(entity)} not found`,
            `No ${entity.toLowerCase()} matched your query.`);
    }
}
