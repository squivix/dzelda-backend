import {API_ROOT, server} from "@/src/server.js";
import {InjectOptions} from "light-my-request";
import http from "http";
import FormData from "form-data";
import fs from "fs-extra";
import path from "path";

export async function fetchRequest(options: InjectOptions, authToken?: string) {
    options.headers = options.headers ?? {};
    if (authToken)
        options.headers.authorization = `Bearer ${authToken}`;
    const {server,API_ROOT} = await import("@/src/server.js");
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

export function readSampleFile(filePath: string, fileName?: string, mimeType?: string): { value: ""; } | { value: Buffer; fileName?: string, mimeType?: string } {
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
