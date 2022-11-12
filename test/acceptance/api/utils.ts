import {API_ROOT, server} from "../../../src/server.js";
import {InjectOptions} from "light-my-request";

export async function fetchRequest(options: InjectOptions) {
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