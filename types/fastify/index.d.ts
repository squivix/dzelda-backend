import {User} from "@/src/models/entities/auth/User.js";
import {EntityManager} from "@mikro-orm/core";

declare module "fastify" {
    interface FastifyRequest {
        user: User | null,
        em: EntityManager,
    }
}