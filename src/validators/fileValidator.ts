import {UnsupportedFileTypeAPIError} from "@/src/utils/errors/UnsupportedFileTypeAPIError.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import imageSize from "image-size";
import {File} from "fastify-formidable";
import {FilesTooLargeAPIError} from "@/src/utils/errors/FilesTooLargeAPIError.js";
import {fileTypeFromFile} from "file-type";
import formidable, {Files} from "formidable";
import {kibiBytes, mebiBytes} from "@/tests/integration/utils.js";

export function validateFileSize(file: File, fieldName: string, sizeInBytes: number) {
    if (file.size > sizeInBytes)
        throw new FilesTooLargeAPIError({field: fieldName, maxSizeInBytes: sizeInBytes});
}


const fileMimeTypes = {
    image: ["image/jpeg", "image/png"],

    audio: ["audio/wav", "audio/wave", "audio/vnd.wave", "audio/mpeg", "application/ogg"]
};

export async function validateFileType(file: File, fieldName: string, type: keyof typeof fileMimeTypes) {
    const mimeType = (await fileTypeFromFile(file.filepath))?.mime;
    if (mimeType && !fileMimeTypes[type].includes(mimeType))
        throw new UnsupportedFileTypeAPIError(fieldName, fileMimeTypes[type]);
}


export function validateImageAspectRatio(imageFile: File, imageFieldName = "image", widthRatio: number, heightRatio: number) {
    let dimensions;
    try {
        dimensions = imageSize(imageFile.filepath);
    } catch (e) {
        if (e instanceof TypeError)
            throw new UnsupportedFileTypeAPIError(imageFieldName, fileMimeTypes["image"]);
    }
    if (dimensions && dimensions.width && dimensions.height) {
        const divisor = (dimensions.width + dimensions.height) / (widthRatio + heightRatio);
        if (dimensions.width !== divisor * widthRatio || dimensions.height !== divisor * heightRatio)
            throw new ValidationAPIError({[imageFieldName]: "Invalid aspect ratio"});
    }
}

export async function validateFileFields(fields: {
    [fieldName: string]: { path: string, validate: (file?: File) => Promise<void> }
}, files: Files): Promise<void> {
    await Promise.all(Object.entries(fields).map(([fieldName, field]) => field.validate(files[fieldName] as File)));
}

export const fileFields = {
    courseImage: {
        path: "uploads/courses/images",
        extensions: ["jpg", "jpeg", "png"],
        minSize: 1,
        maxSize: kibiBytes(500)
    },
    lessonImage: {
        path: "uploads/lessons/images",
        extensions: ["jpg", "jpeg", "png"],
        minSize: 1,
        maxSize: kibiBytes(500)
    },
    lessonAudio: {
        path: "uploads/lessons/audio",
        extensions: ["mp3", "m4a"],
        minSize: 1,
        maxSize: mebiBytes(100)
    },
    profilePicture: {
        path: "uploads/profiles/pictures",
        extensions: ["jpg", "jpeg", "png"],
        minSize: 1,
        maxSize: mebiBytes(1)
    }
};
export type FileFieldType = typeof fileFields;
export const fileFieldsKeys = Object.keys(fileFields);
