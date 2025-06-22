import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {EntityManager} from "@mikro-orm/core";
import {FilesObject} from "fastify-multer/lib/interfaces.js";
import {Session} from "@/src/models/entities/auth/Session.js";

declare module "fastify" {
    interface FastifyRequest {
        session: Session | null,
        user: User | AnonymousUser | null,
        isLoggedIn: boolean,
        em: EntityManager,
        files?: FilesObject
    }
}
