import {AnyEntity, Collection, EntityRepository, FilterQuery} from "@mikro-orm/core";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import path from "path";

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
    relationType: 'to-one' | 'to-many';
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
    computedResolvers: Array<{ path: string, resolve: ((records: AnyEntity[], context: ResolveContext) => Promise<void> | void) }>;
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

export function buildNestedResult<T extends AnyEntity>(
    rootResolver: Record<string, FieldResolver<T>>,
    path: string,
    topLevelResults: T[]
): T[] {
    if (path === "")
        return topLevelResults;
    const keys = path.split('.');
    let currentResolver: FieldResolver<any> | undefined = rootResolver[keys[0]];
    let currentResults: T[] = topLevelResults;

    if (!currentResolver)
        throw new Error(`Resolver for '${keys[0]}' not found`);


    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];

        if (i > 0) {
            if (currentResolver?.type !== 'relation')
                throw new Error(`Expected 'relation' resolver at '${keys.slice(0, i).join('.')}', got '${currentResolver?.type}'`);

            const relationResolvers: FieldResolvers<T> = currentResolver.resolvers;
            currentResolver = relationResolvers[key];

            if (!currentResolver)
                throw new Error(`Resolver for '${keys.slice(0, i + 1).join('.')}' not found`);
        }
        if (currentResolver?.type !== 'relation')
            throw new Error(`Non-relation resolver encountered at '${keys.slice(0, i + 1).join('.')}'`);

        const relationType = currentResolver.relationType;
        const nextResults: T[] = [];

        for (const record of currentResults) {
            const related = record?.[key];
            if (!related)
                throw new Error(`Invalid path: ${path}`);

            if (relationType === 'to-one')
                nextResults.push(related);
            else if (relationType === 'to-many') {
                const items: T[] = related.getItems();
                nextResults.push(...items);
            } else
                throw new Error(`Unknown relationType '${relationType}' at '${keys.slice(0, i + 1).join('.')}'`);
        }
        currentResults = nextResults;
    }

    return currentResults;
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
    const computedResolvers: Array<{ path: string, resolve: ((records: AnyEntity[], context: ResolveContext) => Promise<void> | void) }> = [];

    for (const field of currentView.fields) {
        const resolver = currentResolvers[field];
        if (!resolver)
            throw new Error(`Invalid view field: ${field}, current view=${JSON.stringify(currentView)}`)

        const target = prefix ? `${prefix}.${field}` : field;

        if (resolver.type === 'db' || resolver.type === 'formula')
            localFields.push(target);
        else if (resolver.type === 'computed')
            computedResolvers.push({path: prefix, resolve: resolver.resolve});
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

    for (const {path, resolve} of computedResolvers)
        await resolve(buildNestedResult(resolvers, path, result), context);


    return result;
}