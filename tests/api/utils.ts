import {API_ROOT, server} from "@/src/server.js";
import {InjectOptions} from "light-my-request";
import mimeTypes from "mime-types";
// @ts-ignore
import formAutoContent from "form-auto-content";
import http from "http";

export async function fetchRequest(options: InjectOptions, authToken?: string) {
    if (authToken) {
        if (options.headers)
            options.headers.authorization = `Bearer ${authToken}`
        else
            options.headers = {authorization: `Bearer ${authToken}`}
    }
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


//fallback files encoded as base64 to allow running tests offline

// noinspection SpellCheckingInspection one transparent pixel
const FALLBACK_IMAGE = {
    data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAApJREFUCNdjYAAAAAIAAeIhvDMAAAAASUVORK5CYII",
    type: "image/png"
};

// noinspection SpellCheckingInspection very short audio
const FALLBACK_AUDIO = {
    data: "UklGRiwAAABXQVZFZm10IBAAAAABAAIARKwAABCxAgAEABAAZGF0YQgAAACwNvFldza4ZQ==",
    type: "audio/wav"
};


export async function fetchWithFileUrls(
    {options, authToken}: {
        options: {
            method: string; url: string;
            headers?: http.IncomingHttpHeaders | http.OutgoingHttpHeaders;
            body: {
                data: object,
                files?: { [key: string]: { value: string | Buffer; name?: string, mimeType?: string, fallbackType?: "image" | "audio" } | "" };
            }
        }, authToken?: string
    }) {
    const formData: { data: string; [key: string]: unknown; } = {data: JSON.stringify(options.body.data)};
    if (!options.body.files)
        options.body.files = {};
    for (let [fileKey, file] of Object.entries(options.body.files)) {
        //file field left empty
        if (file === "")
            formData[fileKey] = Buffer.from("");
        else {
            let fileData: Buffer, fileType: string;
            //file field buffer value and mime type explicitly provided
            if (file.value instanceof Buffer) {
                fileData = file.value;
                fileType = file.mimeType!;
            } else {
                //file field provided as a url
                fileData = Buffer.from(file.fallbackType == "image" ? FALLBACK_IMAGE.data : FALLBACK_AUDIO.data, "base64");
                fileType = file.fallbackType == "image" ? FALLBACK_IMAGE.type : FALLBACK_AUDIO.type;
                try {
                    const fileRes = await fetch(file.value)
                    if (fileRes.ok) {
                        const fileBlob = await fileRes.blob();
                        fileData = Buffer.from(await fileBlob.arrayBuffer());
                        fileType = fileBlob.type;
                    }
                } catch (e) {
                }
            }

            formData[fileKey] = {
                value: fileData,
                options: {
                    filename: `${file.name ?? "untitled"}.${mimeTypes.extension(fileType)}`,
                    contentType: fileType
                }
            }
        }
    }
    options = {
        ...options,
        ...formAutoContent(formData)
    }
    return await fetchRequest(options as InjectOptions, authToken);
}