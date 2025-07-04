import {NotFoundError, UniqueConstraintViolationException} from "@mikro-orm/core";
import {ZodError} from "zod";
import {FastifyError, FastifyReply, FastifyRequest} from "fastify";
import {APIError} from "@/src/utils/errors/APIError.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import * as process from "process";
import {extractFieldFromUniqueConstraintError} from "@/src/utils/utils.js";

const isFastifyError = (error: Error): error is FastifyError => {
    return error.name === "FastifyError";
};


export const errorHandler = (error: Error, request: FastifyRequest, reply: FastifyReply) => {
    let apiError: APIError | undefined;
    if (error instanceof APIError)
        apiError = error;
    else if (error instanceof ZodError) {
        const fields: { [field: string]: string } = {};
        //TODO find specific error field for nested objects (don't just use root field invalid)
        for (const issue of error.issues) {
            const paths = issue.path[issue.path.length - 1];
            fields[paths ?? "root"] = issue.message;
        }

        apiError = new ValidationAPIError(fields);
    } else if (error instanceof NotFoundError) {
        const entity = error.message.split(" ")[0];
        if (entity)
            apiError = new NotFoundAPIError(entity);
    } else if (error instanceof UniqueConstraintViolationException) {
        const field = extractFieldFromUniqueConstraintError(error);
        if (field)
            apiError = new ValidationAPIError({[field]: "Not unique"});
    } else if (isFastifyError(error)) {
        if (error.statusCode && error.statusCode < 500)
            apiError = new APIError(error.statusCode, error.message);
    } else if ("statusCode" in error && error.statusCode == 429) {
        apiError = new APIError(429, error.message);
    }

    if (apiError)
        reply.status(apiError.statusCode).send(apiError.toJSON());
    else {
        if (process.env.NODE_ENV == "dev" || process.env.NODE_ENV == "test")
            console.log(error);
        reply.status(500).send("Something went wrong");
    }
};
