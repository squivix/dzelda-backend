import {API_ROOT, server} from "@/src/server.js";
import {InjectOptions} from "light-my-request";
import {EntityClass} from "@mikro-orm/core/typings.js";
import {EntityData} from "@mikro-orm/core";

export async function fetchRequest(options: InjectOptions, authToken?: string) {
    options.headers = options.headers ?? {};
    if (authToken)
        options.headers.authorization = `Bearer ${authToken}`;
    const {server, API_ROOT} = await import("@/src/server.js");
    return await server.inject({
        ...options,
        url: `${API_ROOT}/${options.url}`
    });
}

export function buildParams(data: object) {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value))
            value.forEach(value => params.append(key, value.toString()));
        else
            params.append(key, value.toString());
    });
    return params;
}

export function buildQueryString(data: object) {
    const queryString = buildParams(data).toString();
    if (queryString !== "")
        return `?${queryString}`;
    else
        return queryString;
}

export function parseUrlQueryString(url: string) {
    return Object.fromEntries(new URL(url).searchParams.entries());
}


export function createComparator<T>(entityName: EntityClass<T>,
                                    properties: {
                                        property: string,
                                        order: "asc" | "desc",
                                        preProcess?: (value: any) => any,
                                        comparator?: (value1: any, value2: any) => number,
                                    }[]): (obj1: T | EntityData<T>, obj2: T | EntityData<T>) => number {
    return (obj1, obj2) => {
        for (const {property, order, preProcess, comparator} of properties) {
            let value1 = getValue(obj1, property);
            let value2 = getValue(obj2, property);

            if (preProcess !== undefined) {
                value1 = preProcess(value1);
                value2 = preProcess(value2);
            }

            if (comparator !== undefined)
                return comparator(value1, value2);

            if (value1 < value2) return order == "asc" ? -1 : 1;
            if (value1 > value2) return order == "asc" ? 1 : -1;
        }
        return 0;
    };

    function getValue(obj: any, property: string): any {
        const properties = property.split(".");
        return properties.reduce((acc, prop) => acc[prop], obj);
    }
}

export function kibiBytes(sizeInKib: number) {
    return sizeInKib * 1024;
}

export function mebiBytes(sizeInMib: number) {
    return sizeInMib * 1048576;
}

//from https://stackoverflow.com/a/77249194
export function extractValuesAsTuple<T extends Record<string, any>>(
    obj: T
): [T[keyof T], ...T[keyof T][]] {
    const values = Object.values(obj) as T[keyof T][];
    if (values.length === 0)
        throw new Error("Object must have at least one value.");

    // Explicitly extract the first value
    const result: [T[keyof T], ...T[keyof T][]] = [values[0], ...values.slice(1)];

    return result;
}
