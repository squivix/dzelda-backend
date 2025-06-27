import {AnyEntity, EntityRepository, FilterQuery} from "@mikro-orm/core";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {nestValueAtPath} from "@/src/models/modelUtils.js";

export type FetchContext = {
    user: User | AnonymousUser | null;
    [key: string]: any;
}

export interface DBColumnFieldSepc {
    type: "db-column"
}

export interface FormulaFieldSpec {
    type: "formula"
}

export interface RelationFieldSpec {
    type: "relation";
    populate: string;
    /** field fetch specs map for the related entity allowing nested composition */
    fieldFetchSpecsMap: FieldFetchSpecsMap<any>;
    defaultContextFilter?: (context: FetchContext) => FilterQuery<any>;
    relationType: "to-one" | "to-many";
}

export interface AnnotatedFieldSpec<T extends AnyEntity> {
    type: "annotated";
    annotate: (records: T[], context: FetchContext) => Promise<void> | void;
}

export type FieldFetchSpec<T extends AnyEntity> =
    | DBColumnFieldSepc
    | FormulaFieldSpec
    | RelationFieldSpec
    | AnnotatedFieldSpec<T>;

export type FieldFetchSpecsMap<T extends AnyEntity> = Record<string, FieldFetchSpec<T>>;

export interface ViewDescription {
    fields: string[];
    /** description of relations with optional nested views */
    relations?: Record<string, ViewDescription | string[]>;
}


type RelationFilters = Record<string, FilterQuery<any>>;

interface FetchPlan {
    localFields: string[];
    localPopulate: string[];
    filteredPopulates: { populate: string[]; filter: FilterQuery<any>, fields: string[] }[];
    annotatedFields: Array<{ path: string, annotate: ((records: AnyEntity[], context: FetchContext) => Promise<void> | void) }>;
}


export function getResultAtPath<T extends AnyEntity>(
    rootFetchMap: FieldFetchSpecsMap<T>,
    path: string,
    topLevelResults: T[]
): T[] {
    if (path === "")
        return topLevelResults;
    const keys = path.split(".");
    let currentFetchSpec: FieldFetchSpec<any> | undefined = rootFetchMap[keys[0]];
    let currentResults: T[] = topLevelResults;

    if (!currentFetchSpec)
        throw new Error(`Field fetch map for '${keys[0]}' not found`);


    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];

        if (i > 0) {
            if (currentFetchSpec?.type !== "relation")
                throw new Error(`Expected 'relation' field at '${keys.slice(0, i).join(".")}', got '${currentFetchSpec?.type}'`);

            const relationFieldFetchMap: FieldFetchSpecsMap<T> = currentFetchSpec.fieldFetchSpecsMap;
            currentFetchSpec = relationFieldFetchMap[key];

            if (!currentFetchSpec)
                throw new Error(`Field fetch spec for '${keys.slice(0, i + 1).join(".")}' not found`);
        }
        if (currentFetchSpec?.type !== "relation")
            throw new Error(`Non-relation field encountered at '${keys.slice(0, i + 1).join(".")}'`);

        const relationType = currentFetchSpec.relationType;
        const nextResults: T[] = [];

        for (const record of currentResults) {
            const related = record?.[key];
            if (!related)
                throw new Error(`Invalid path: ${path}`);

            if (relationType === "to-one")
                nextResults.push(related);
            else if (relationType === "to-many") {
                const items: T[] = related.getItems();
                nextResults.push(...items);
            } else
                throw new Error(`Unknown relationType '${relationType}' at '${keys.slice(0, i + 1).join(".")}'`);
        }
        currentResults = nextResults;
    }

    return currentResults;
}


export function buildFetchPlan(
    currentView: ViewDescription,
    currentFieldFetchSpecsMap: FieldFetchSpecsMap<any>,
    context: FetchContext,
    relationFilters: RelationFilters,
    prefix = ""
): FetchPlan {
    const localFields: string[] = [];
    const localPopulate: string[] = [];

    const filteredPopulates: { populate: string[]; filter: FilterQuery<any>, fields: string[] }[] = [];
    const annotatedFields: Array<{ path: string, annotate: ((records: AnyEntity[], context: FetchContext) => Promise<void> | void) }> = [];

    for (const field of currentView.fields) {
        const fieldFetchSpec = currentFieldFetchSpecsMap[field];
        if (!fieldFetchSpec)
            throw new Error(`Invalid view field: ${field}, current view=${JSON.stringify(currentView)}`)

        const target = prefix ? `${prefix}.${field}` : field;

        if (fieldFetchSpec.type === "db-column" || fieldFetchSpec.type === "formula")
            localFields.push(target);
        else if (fieldFetchSpec.type === "annotated")
            annotatedFields.push({path: prefix, annotate: fieldFetchSpec.annotate});
    }

    if (currentView.relations) {
        for (const [relation, sub] of Object.entries(currentView.relations)) {
            const relationFieldFetchSpec = currentFieldFetchSpecsMap[relation];
            if (!relationFieldFetchSpec || relationFieldFetchSpec.type !== "relation")
                continue;
            const path = prefix ? `${prefix}.${relationFieldFetchSpec.populate}` : relationFieldFetchSpec.populate;
            const subView: ViewDescription = Array.isArray(sub) ? {fields: sub} : sub;
            const nested = buildFetchPlan(subView, relationFieldFetchSpec.fieldFetchSpecsMap, context, relationFilters, path);

            const externalFilter = relationFilters?.[path];
            const contextFilter = relationFieldFetchSpec.defaultContextFilter?.(context);

            if (contextFilter || externalFilter) {
                const filter = contextFilter && externalFilter
                    ? {$and: [contextFilter, externalFilter]}
                    : contextFilter || externalFilter;
                filteredPopulates.push({
                    populate: [path, ...nested.localPopulate],
                    filter: nestValueAtPath(path, filter),
                    fields: nested.localFields
                });
            } else {
                localPopulate.push(path);
                localFields.push(...nested.localFields);
                localPopulate.push(...nested.localPopulate);
            }

            filteredPopulates.push(...nested.filteredPopulates);
            annotatedFields.push(...nested.annotatedFields);
        }
    }

    return {
        localFields,
        localPopulate,
        filteredPopulates,
        annotatedFields: annotatedFields,
    };
}


export async function fetchAndResolveEntityView<T extends AnyEntity>(
    repo: EntityRepository<T>,
    where: FilterQuery<T>,
    relationFilters: RelationFilters,
    view: ViewDescription,
    fieldFetchSpecsMap: FieldFetchSpecsMap<T>,
    context: FetchContext,
): Promise<T[]> {
    const {
        localFields: topLevelFields,
        localPopulate: topLevelPopulate,
        filteredPopulates,
        annotatedFields
    } = buildFetchPlan(view, fieldFetchSpecsMap, context, relationFilters);

    const result = await repo.find(where, {
        fields: topLevelFields as any,
        populate: topLevelPopulate as any,
    });

    for (const {populate, filter, fields} of filteredPopulates)
        await repo.populate(result, populate as any, {where: filter, fields: fields});

    for (const {path, annotate} of annotatedFields)
        await annotate(getResultAtPath(fieldFetchSpecsMap, path, result), context);

    return result;
}