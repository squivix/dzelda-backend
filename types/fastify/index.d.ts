import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {EntityManager} from "@mikro-orm/core";
import {FilesObject} from "fastify-multer/lib/interfaces.js";

declare module "fastify" {
    interface FastifyRequest {
        user: User | AnonymousUser | null,
        em: EntityManager,
        files?: FilesObject
    }
}