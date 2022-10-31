import {UniqueConstraintViolationException} from "@mikro-orm/core";
import {ZodError} from "zod";
import {FastifyReply, FastifyRequest} from "fastify";

export default (error: Error, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ZodError || error instanceof UniqueConstraintViolationException) {
        reply.status(400).send({...error});
    } else {
        reply.code(500).send("Something went wrong!");
        throw error;
    }
}