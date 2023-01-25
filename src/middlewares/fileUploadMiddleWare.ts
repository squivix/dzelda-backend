import multer from "fastify-multer";
import crypto from "crypto";
import mimeTypes from "mime-types";
import fs from "fs-extra";
import {FastifyReply, FastifyRequest} from "fastify";
import {UnsupportedMediaTypeAPIError} from "@/src/utils/errors/UnsupportedMediaTypeAPIError.js";
import {FileFilter} from "fastify-multer/lib/interfaces.js";
import {onResponseHookHandler, preHandlerHookHandler} from "fastify/types/hooks.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {FilesTooLargeAPIError} from "@/src/utils/errors/FilesTooLargeAPIError.js";

export const fileMimeTypes = {
    image: ["image/jpeg", "image/png"],

    audio: ["audio/wav", "audio/mpeg"]

}
export const MAX_ALL_FILES_SIZE = 500 * 1024 * 1024;

export function uploadMiddleWares(fields: { [fieldName: string]: { path?: string, type: "image" | "audio", maxCount?: number, maxSize?: number } }): preHandlerHookHandler[] {
    const multerStorage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, fields[file.fieldname].path!),
        filename: (req, file, cb) => cb(null, `${crypto.randomBytes(8).toString("hex")}-${Date.now()}.${mimeTypes.extension(file.mimetype)}`)
    })

    const fileTypeFilter: FileFilter = function (req, file, cb) {
        const supportedMimeTypes = fileMimeTypes[fields[file.fieldname].type]
        if (!supportedMimeTypes.includes(file.mimetype))
            return cb(new UnsupportedMediaTypeAPIError(file.fieldname, supportedMimeTypes), false)
        cb(null, true)
    }


    const multerMiddleware = multer({
        storage: multerStorage,
        fileFilter: fileTypeFilter,
        limits: {fileSize: MAX_ALL_FILES_SIZE}
    }).fields(Object.entries(fields).map(([fieldName, field]) => ({
        name: fieldName,
        maxCount: field.maxCount ?? 1
    })));
    return [multerMiddleware,
        async (request) => {
            if (request.files)
                Object.entries(request.files).forEach(([requestFieldName, requestField]) => {
                    const totalFileSize = requestField.reduce((acc, file) => acc + (file.size ?? 0), 0);
                    const fieldMaxSize = fields[requestFieldName].maxSize;
                    if (fieldMaxSize && totalFileSize > fieldMaxSize)
                        throw new FilesTooLargeAPIError({field: requestFieldName, maxSize: fieldMaxSize});
                })
        },
        async (request) => {
            try {
                (request.body as any).data = JSON.parse((request.body as any).data);
            } catch (e) {
                throw new ValidationAPIError({data: {message: "data field is not a valid JSON"}})
            }
        }
    ]
}

//delete uploaded files if request is not ok
export const deleteFileOnFail: onResponseHookHandler = (request: FastifyRequest, reply: FastifyReply) => {
    if (request.files && !(reply.statusCode >= 200 && reply.statusCode <= 299))
        Object.values(request.files).forEach((fields) => Promise.all(fields.map(async file => await fs.remove(file.path!))))
}
