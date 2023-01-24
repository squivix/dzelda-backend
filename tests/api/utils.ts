import {API_ROOT, server} from "@/src/server.js";
import {InjectOptions} from "light-my-request";
import mimeTypes from "mime-types";
// @ts-ignore
import formAutoContent from "form-auto-content";
import http from "http";

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


//fallback files encoded as base64 to allow running tests offline

// noinspection SpellCheckingInspection one transparent pixel
const FALLBACK_IMAGE = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAApJREFUCNdjYAAAAAIAAeIhvDMAAAAASUVORK5CYII";
const FALLBACK_IMAGE_TYPE = "image/png";

// noinspection SpellCheckingInspection very short audio
const FALLBACK_AUDIO = "UklGRiwAAABXQVZFZm10IBAAAAABAAIARKwAABCxAgAEABAAZGF0YQgAAACwNvFldza4ZQ==";
const FALLBACK_AUDIO_TYPE = "audio/wav";

export async function fetchWithFileUrls(
    {options, authToken}: {
        options: {
            method: string; url: string;
            headers?: http.IncomingHttpHeaders | http.OutgoingHttpHeaders;
            body: { data: object, files: { url: string; key: string, name: string, type: "image" | "audio" } []; }
        }, authToken?: string
    }) {
    const formData: { data: string; [key: string]: unknown; } = {data: JSON.stringify(options.body.data)};
    for (let file of options.body.files) {
        if (file.url) {
            let fileData = Buffer.from(file.type == "image" ? FALLBACK_IMAGE : FALLBACK_AUDIO, "base64");
            let fileType = file.type == "image" ? FALLBACK_IMAGE_TYPE : FALLBACK_AUDIO_TYPE;
            try {
                const fileRes = await fetch(file.url)
                if (fileRes.ok) {
                    const fileBlob = await fileRes.blob();
                    fileData = Buffer.from(await fileBlob.arrayBuffer());
                    fileType = fileBlob.type;
                }
            } catch (e) {
            }
            formData[file.key] = {
                value: fileData,
                options: {
                    filename: `${file.name}.${mimeTypes.extension(fileType)}`,
                    contentType: fileType
                }
            }
        } else
            formData[file.key] = Buffer.from("");
    }
    options = {
        ...options,
        ...formAutoContent(formData)
    }
    if (authToken)
        options.headers!.authorization = `Bearer ${authToken}`
    return await fetchRequest(options as InjectOptions);
}