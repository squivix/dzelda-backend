import {EntityManager, EntityRepository} from "@mikro-orm/core";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";
import {Session} from "@/src/models/entities/auth/Session.js";

declare module "vitest" {
    export interface TestContext {
        em: EntityManager;
        userFactory: UserFactory;
        profileFactory: ProfileFactory;
        sessionFactory: SessionFactory;
    }
}