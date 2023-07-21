import {Factory} from "@mikro-orm/seeder";
import {EntityData, EntityManager} from "@mikro-orm/core";

/**
 * An Entity Factory that overrides make/makeOne functions so as not to persist entity
 */
export abstract class CustomFactory<T extends Object> extends Factory<T> {

    makeOne(overrideParameters?: EntityData<T>): T {
        return this.makeEntity(overrideParameters);
    }

    make(amount: number, overrideParameters?: EntityData<T>): T[] {
        return [...Array(amount)].map(() => {
            return this.makeEntity(overrideParameters);
        });
    }

    async createOne(overrideParameters?: EntityData<T>): Promise<T> {
        const em = (this as any).em as EntityManager;
        const entity = this.makeOne(overrideParameters);
        em.persist(entity);
        await em.flush();
        return entity;
    }

    async create(amount: number, overrideParameters?: EntityData<T>): Promise<T[]> {
        const em = (this as any).em as EntityManager;
        const entities = this.make(amount, overrideParameters);
        em.persist(entities);
        await em.flush();
        return entities;
    }
}
