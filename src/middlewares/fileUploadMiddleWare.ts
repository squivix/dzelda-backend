import {FastifyReply, FastifyRequest, onResponseHookHandler, preHandlerHookHandler} from "fastify";
import {File, kIsMultipart} from "fastify-formidable";
import {UnsupportedContentTypeAPIError} from "@/src/utils/errors/UnsupportedContentTypeAPIError.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import fs from "fs-extra";
import formidable from "formidable";
import path from "path";
import crypto from "crypto"

export const MAX_TOTAL_FILE_UPLOAD_SIZE = 500 * 1024 * 1024;
export const ROOT_UPLOAD_DIR = "public/uploads";

export function singleFileUploadMiddleWare(fields: { [fieldName: string]: { path: string, validate: (file?: File) => void } }): preHandlerHookHandler {
    return async (request) => {
        const formidableInstance = formidable({
            maxFileSize: MAX_TOTAL_FILE_UPLOAD_SIZE,
            uploadDir: ROOT_UPLOAD_DIR,
            keepExtensions: true
        })

        await fs.ensureDir(ROOT_UPLOAD_DIR)
        await Promise.all(Object.values(fields).map(async f => await fs.ensureDir(`${ROOT_UPLOAD_DIR}/${f.path}`)))

        formidableInstance.addListener("fileBegin", (formName: string, file: File) => {
            if (fields[formName]) {
                const fileName = `${crypto.randomBytes(8).toString("hex")}-${Date.now()}`;
                file.filepath = `${path.dirname(file.filepath)}/${fields[formName].path}/${fileName}.${path.extname(file.filepath)}`;
            }
        })
        await request.parseMultipart(formidableInstance);

        if (!request[kIsMultipart])
            throw new UnsupportedContentTypeAPIError("multipart/form-data");

        Object.entries(fields).map(([fieldName, field]) => field.validate(request.files?.[fieldName] as File))
        try {
            (request.body as any).data = JSON.parse((request.body as any).data);
        } catch (e) {
            throw new ValidationAPIError({data: {message: "not a valid JSON"}});
        }
    };
}

//delete uploaded files if request is not ok
export const deleteFileOnFail: onResponseHookHandler = (request: FastifyRequest, reply: FastifyReply) => {
    if (request.files && !(reply.statusCode >= 200 && reply.statusCode <= 299)) {
        Object.values(request.files).map(async field => {
            const files = field instanceof Array ? field : [field];
            await Promise.all(files.map(async file => await fs.remove(file.filepath)));
        })
    }
}
