import {Factory} from "@mikro-orm/seeder";
import {EntityData} from "@mikro-orm/core";

/**
 * An Entity Factory that overrides make/makeOne functions so as not to persist entity
 */
export abstract class CustomFactory<T extends Object> extends Factory<T> {

    makeOne(overrideParameters?: EntityData<T>): T {
        let ret = super.makeOne(overrideParameters);
        (this as any).em.clear();
        return ret;
    }

    make(amount: number, overrideParameters?: EntityData<T>): T[] {
        let ret = super.make(amount, overrideParameters);
        (this as any).em.clear();
        return ret;
    }


    async createOne(overrideParameters?: EntityData<T>): Promise<T> {
        const entity = (this as any).makeEntity(overrideParameters);
        (this as any).em.persist(entity);
        await (this as any).em.flush();
        return entity;
    }

    async create(amount: number, overrideParameters?: EntityData<T>): Promise<T[]> {
        const entities = [...Array(amount)].map(() => {
            return (this as any).makeEntity(overrideParameters);
        });
        (this as any).em.persist(entities);
        await (this as any).em.flush();
        return entities;
    }
}