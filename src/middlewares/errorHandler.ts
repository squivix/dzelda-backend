import {NotFoundError, UniqueConstraintViolationException} from "@mikro-orm/core";
import {ZodError} from "zod";
import {FastifyError, FastifyReply, FastifyRequest} from "fastify";
import {APIError} from "@/src/utils/errors/APIError.js";
import {FieldsObject, ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import * as process from "process";

const isFastifyError = (error: Error): error is FastifyError => {
    return error.name === "FastifyError";
}


export const errorHandler = (error: Error, request: FastifyRequest, reply: FastifyReply) => {
    let apiError: APIError | undefined;
    if (process.env.NODE_ENV == "dev")
        console.log(error);
    if (error instanceof APIError)
        apiError = error;
    else if (error instanceof ZodError) {
        const fields: FieldsObject = {};
        //TODO find specific error field for nested objects (don't just use root field invalid)
        for (const issue of error.issues)
            fields[issue.path[0] ?? "root"] = {message: issue.message};

        apiError = new ValidationAPIError(fields);
    } else if (error instanceof NotFoundError) {
        const entity = error.message.split(" ")[0];
        if (entity)
            apiError = new NotFoundAPIError(entity);
    } else if (error instanceof UniqueConstraintViolationException) {
        // TODO find a better way of extracting field from error
        //extracts column name from error message: "Key (column)=(value) already exists."
        const field = (error as any).detail?.match(/\(([^)]*)\)/)?.pop();
        if (field)
            apiError = new ValidationAPIError({[field]: {message: "not unique"}});
    }
    else if (isFastifyError(error)) {
        if (error.statusCode && error.statusCode < 500)
            apiError = new APIError(error.statusCode, error.message)
    }

    if (apiError)
        reply.status(apiError.statusCode).send(apiError.toJSON());
    else {
        console.error(error);
        reply.status(500).send("Something went wrong");
    }
}
