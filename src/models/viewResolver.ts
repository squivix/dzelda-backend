import {AnyEntity, EntityRepository, FilterQuery} from "@mikro-orm/core";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";

export type ResolverType = 'db' | 'formula' | 'relation' | 'computed';

export type ResolveContext = {
    user: User | AnonymousUser | null;
    [key: string]: any;
}

export interface DBFieldResolver {
    type: 'db'
}

export interface FormulaFieldResolver {
    type: 'formula'
}

export interface RelationFieldResolver {
    type: 'relation';
    populate: string;
    /** field resolvers for the related entity allowing nested composition */
    resolvers: FieldResolvers<any>;
    defaultContextFilter?: (context: ResolveContext) => FilterQuery<any>;
}

export interface ComputedFieldResolver<T extends AnyEntity> {
    type: 'computed';
    resolve: (records: T[], context: ResolveContext) => Promise<void> | void;
}

export type FieldResolver<T extends AnyEntity> =
    | DBFieldResolver
    | FormulaFieldResolver
    | RelationFieldResolver
    | ComputedFieldResolver<T>;

export type FieldResolvers<T extends AnyEntity> = Record<string, FieldResolver<T>>;

export interface ViewDescription {
    fields: string[];
    /** description of relations with optional nested views */
    relations?: Record<string, ViewDescription | string[]>;
}


interface GatheredDetails {
    localFields: string[];
    localPopulate: string[];
    filteredPopulates: { populate: string[]; filter: FilterQuery<any>, fields: string[] }[];
    computedResolvers: ((records: AnyEntity[], context: ResolveContext) => Promise<void> | void)[];
}

type RelationFilters = Record<string, FilterQuery<any>>;

function buildNestedObject(path: string, value: { [key: string]: any }): { [key: string]: any } {
    const keys = path.split('.');
    const result: { [key: string]: any } = {};
    let current = result;

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];

        if (i === keys.length - 1)
            current[key] = value;
        else {
            current[key] = {};
            current = current[key];
        }
    }

    return result;
}

export function gatherViewDetails(
    currentView: ViewDescription,
    currentResolvers: FieldResolvers<any>,
    context: ResolveContext,
    relationFilters: RelationFilters,
    prefix = ''
): GatheredDetails {
    const localFields: string[] = [];
    const localPopulate: string[] = [];

    const filteredPopulates: { populate: string[]; filter: FilterQuery<any>, fields: string[] }[] = [];
    const computedResolvers: ((records: AnyEntity[], context: ResolveContext) => Promise<void> | void)[] = [];

    for (const field of currentView.fields) {
        const resolver = currentResolvers[field];
        if (!resolver)
            throw new Error(`Invalid view field: ${field}, current view=${JSON.stringify(currentView)}`)

        const target = prefix ? `${prefix}.${field}` : field;

        if (resolver.type === 'db' || resolver.type === 'formula')
            localFields.push(target);
        else if (resolver.type === 'computed')
            computedResolvers.push(resolver.resolve);
    }

    if (currentView.relations) {
        for (const [relation, sub] of Object.entries(currentView.relations)) {
            const resolver = currentResolvers[relation];
            if (!resolver || resolver.type !== 'relation') continue;

            const path = prefix ? `${prefix}.${resolver.populate}` : resolver.populate;
            const subView: ViewDescription = Array.isArray(sub) ? {fields: sub} : sub;
            const nested = gatherViewDetails(subView, resolver.resolvers, context, relationFilters, path);

            const externalFilter = relationFilters?.[path];
            const contextFilter = resolver.defaultContextFilter?.(context);

            if (contextFilter || externalFilter) {
                const filter = contextFilter && externalFilter
                    ? {$and: [contextFilter, externalFilter]}
                    : contextFilter || externalFilter;
                filteredPopulates.push({
                    populate: [path, ...nested.localPopulate],
                    filter: buildNestedObject(path, filter),
                    fields: nested.localFields
                });
            } else {
                localPopulate.push(path);
                localFields.push(...nested.localFields);
                localPopulate.push(...nested.localPopulate);
            }

            filteredPopulates.push(...nested.filteredPopulates);
            computedResolvers.push(...nested.computedResolvers);
        }
    }

    return {
        localFields,
        localPopulate,
        filteredPopulates,
        computedResolvers,
    };
}


export async function resolveView<T extends AnyEntity>(
    repo: EntityRepository<T>,
    where: FilterQuery<T>,
    relationFilters: RelationFilters,
    view: ViewDescription,
    resolvers: FieldResolvers<T>,
    context: ResolveContext,
): Promise<T[]> {
    const {
        localFields: topLevelFields,
        localPopulate: topLevelPopulate,
        filteredPopulates,
        computedResolvers
    } = gatherViewDetails(view, resolvers, context, relationFilters);

    const result = await repo.find(where, {
        fields: topLevelFields as any,
        populate: topLevelPopulate as any,
    });

    for (const {populate, filter, fields} of filteredPopulates)
        await repo.populate(result, populate as any, {where: filter, fields: fields});

    for (const comp of computedResolvers)
        await comp(result, context);

    return result;
}