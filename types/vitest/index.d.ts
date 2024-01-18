import {EntityManager} from "@mikro-orm/core";
import {UserFactory} from "@/devtools/factories/UserFactory.js";
import {ProfileFactory} from "@/devtools/factories/ProfileFactory.js";
import {SessionFactory} from "@/devtools/factories/SessionFactory.js";

declare module "vitest" {
    export interface TestContext {
        em: EntityManager;
        userFactory: UserFactory;
        profileFactory: ProfileFactory;
        sessionFactory: SessionFactory;
    }
}
