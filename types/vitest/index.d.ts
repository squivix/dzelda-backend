import {EntityManager} from "@mikro-orm/core";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";

declare module "vitest" {
    export interface TestContext {
        em: EntityManager;
        userFactory: UserFactory;
        profileFactory: ProfileFactory;
        sessionFactory: SessionFactory;
    }
}
