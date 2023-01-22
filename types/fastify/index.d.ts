import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {EntityManager} from "@mikro-orm/core";

declare module "fastify" {
    interface FastifyRequest {
        user: User | AnonymousUser | null,
        em: EntityManager
    }
}