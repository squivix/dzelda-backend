import {Factory} from "@mikro-orm/seeder";
import {EntityData, EntityManager, RequiredEntityData} from "@mikro-orm/core";
import {faker} from "@faker-js/faker";

/**
 * An Entity Factory that overrides make/makeOne functions so as not to persist entity
 * adds public makeDefinition/makeDefinitions functions for just returning EntityData<T> POJOs
 * and overrides makeEntity to call makeDefinition
 */
export abstract class CustomFactory<T extends Object> extends Factory<T> {
    override makeEntity(overrideParameters?: EntityData<T>): T {
        const em = (this as any).em as EntityManager;
        const entity = em.create(this.model, this.makeDefinition(overrideParameters) as unknown as RequiredEntityData<T>, {persist: false});
        const eachFunction = (this as any).eachFunction as (entity: T) => void;
        if (eachFunction) {
            eachFunction(entity);
        }

        return entity;
    }

    public makeDefinition(overrideParameters?: EntityData<T>, exclude?: Array<keyof EntityData<T>>): EntityData<T> {
        const definition = {
            ...this.definition(faker),
            ...overrideParameters
        }
        if (exclude !== undefined)
            exclude.forEach(k => delete definition[k])
        return definition;
    }

    public makeDefinitions(amount: number, overrideParameters?: EntityData<T>): EntityData<T>[] {
        return [...Array(amount)].map(() => this.makeDefinition(overrideParameters));
    }

    override makeOne(overrideParameters?: EntityData<T>): T {
        return this.makeEntity(overrideParameters);
    }

    override make(amount: number, overrideParameters?: EntityData<T>): T[] {
        return [...Array(amount)].map(() => {
            return this.makeEntity(overrideParameters);
        });
    }

    override async createOne(overrideParameters?: EntityData<T>): Promise<T> {
        const em = (this as any).em as EntityManager;
        const entity = this.makeOne(overrideParameters);
        em.persist(entity);
        await em.flush();
        return entity;
    }

    override async create(amount: number, overrideParameters?: EntityData<T>): Promise<T[]> {
        const em = (this as any).em as EntityManager;
        const entities = this.make(amount, overrideParameters);
        em.persist(entities);
        await em.flush();
        return entities;
    }
}
