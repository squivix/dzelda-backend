import {FastifyReply, FastifyRequest, onResponseHookHandler, preHandlerHookHandler} from "fastify";
import {File, kIsMultipart} from "fastify-formidable";
import {UnsupportedContentTypeAPIError} from "@/src/utils/errors/UnsupportedContentTypeAPIError.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import fs from "fs-extra";
import formidable, {Files} from "formidable";
import path from "path";
import crypto from "crypto";
import {validateFileFields} from "@/src/validators/fileValidator.js";
import {MAX_TOTAL_FILE_UPLOAD_SIZE_IN_BYTES, ROOT_UPLOAD_DIR} from "@/src/constants.js";


export function fileUploadMiddleware(fields: {
    [fieldName: string]: { path: string, validate: (file?: File) => Promise<void> }
}): preHandlerHookHandler {
    return async (request) => {
        const formidableInstance = formidable({
            maxTotalFileSize: MAX_TOTAL_FILE_UPLOAD_SIZE_IN_BYTES,
            uploadDir: ROOT_UPLOAD_DIR,
            keepExtensions: true
        });

        await fs.ensureDir(ROOT_UPLOAD_DIR);
        await Promise.all(Object.values(fields).map(async f => await fs.ensureDir(`${ROOT_UPLOAD_DIR}/${f.path}`)));

        formidableInstance.addListener("fileBegin", (formName: string, file: File) => {
            if (fields[formName]) {
                const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
                file.filepath = `${ROOT_UPLOAD_DIR}/${fields[formName].path}/${fileName}${path.extname(file.filepath)}`;
            }
        });
        //TODO don't allow any string in file field. If file field is for example "abc" or "null", return 400
        await request.parseMultipart(formidableInstance);

        if (!request[kIsMultipart])
            throw new UnsupportedContentTypeAPIError("multipart/form-data");

        await validateFileFields(fields, request.files!);
        try {
            (request.body as any).data = JSON.parse((request.body as any).data);
        } catch (e) {
            throw new ValidationAPIError({data: "not a valid JSON"});
        }
    };
}

//delete uploaded files if request is not ok
export const deleteFileOnFail: onResponseHookHandler = (request: FastifyRequest, reply: FastifyReply) => {
    if (request.files && !(reply.statusCode >= 200 && reply.statusCode <= 299)) {
        Object.values(request.files).map(async field => {
            const files = field instanceof Array ? field : [field];
            await Promise.all(files.map(async file => await fs.remove(file.filepath)));
        });
    }
};
