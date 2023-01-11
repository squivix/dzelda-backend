import {EntityManager} from "@mikro-orm/core";

declare module "vitest" {
    export interface TestContext {
        em: EntityManager;
    }
}