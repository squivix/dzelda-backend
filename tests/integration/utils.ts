import {API_ROOT, server} from "@/src/server.js";
import {InjectOptions} from "light-my-request";
import http from "http";
import FormData from "form-data";
import fs from "fs-extra";
import path from "path";
import {File, Files} from "fastify-formidable/lib/mjs/index.js";
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

export function readSampleFile(filePath: string, fileName?: string, mimeType?: string): { value: ""; } | {
    value: Buffer;
    fileName?: string,
    mimeType?: string
} {
    return {value: fs.readFileSync(`tests/integration/sample-files/${filePath}`), fileName: fileName ?? path.basename(filePath), mimeType};
}

export async function fetchWithFiles(
    {options, authToken}: {
        options: {
            method: string; url: string;
            headers?: http.IncomingHttpHeaders | http.OutgoingHttpHeaders;
            body: { data?: object, files?: { [key: string]: { value: ""; } | { value: Buffer; fileName?: string, mimeType?: string } }; }
        }, authToken?: string
    }) {
    const formData = new FormData();
    if (options.body.data)
        formData.append("data", JSON.stringify(options.body.data));
    if (!options.body.files)
        options.body.files = {};
    for (let [fileKey, file] of Object.entries(options.body.files)) {
        formData.append(fileKey, file.value, file.value === "" ? undefined : {
            filename: `${file.fileName ?? "untitled"}`,
            contentType: file.mimeType
        });
    }
    options = {
        ...options,
        // @ts-ignore
        payload: formData,
        headers: formData.getHeaders()
    };
    return await fetchRequest(options as InjectOptions, authToken);
}

export function mockValidateFileFields(fakeFieldFileSizes: { [fieldName: string]: number }) {
    return async (fields: {
        [fieldName: string]: { path: string, validate: (file?: File) => Promise<void> }
    }, files: Files): Promise<void> => {
        await Promise.all(Object.entries(fields).map(([fieldName, field]) => {
            const file = files[fieldName] as File;
            if (fieldName in fakeFieldFileSizes)
                file.size = fakeFieldFileSizes[fieldName];
            return field.validate(file);
        }));
    };
}

export function createComparator<T>(entityName: EntityClass<T>,
                                    properties: {
                                        property: keyof (T | EntityData<T>),
                                        order: "asc" | "desc",
                                        preProcess?: (value: any) => any,
                                        comparator?: (value1: any, value2: any) => number,
                                    }[]): (obj1: T | EntityData<T>, obj2: T | EntityData<T>) => number {
    return (obj1, obj2) => {
        for (const {property, order, preProcess, comparator} of properties) {
            let value1 = obj1[property];
            let value2 = obj2[property];
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
}
