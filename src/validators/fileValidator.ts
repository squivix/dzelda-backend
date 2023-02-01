import {UnsupportedFileTypeAPIError} from "@/src/utils/errors/UnsupportedFileTypeAPIError.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import imageSize from "image-size";
import {File} from "fastify-formidable";
import {FilesTooLargeAPIError} from "@/src/utils/errors/FilesTooLargeAPIError.js";

export function validateFileSize(file: File, fieldName: string, sizeInKb: number) {
    if (file.size > sizeInKb * 1024)
        throw new FilesTooLargeAPIError({field: fieldName, maxSizeInKb: sizeInKb})
}


const fileMimeTypes = {
    image: ["image/jpeg", "image/png"],

    audio: ["audio/wav", "audio/mpeg"]
}

export function validateFileMimeType(file: File, fieldName: string, type: keyof typeof fileMimeTypes) {
    if (file.mimetype && !fileMimeTypes[type].includes(file.mimetype))
        throw new UnsupportedFileTypeAPIError(fieldName, fileMimeTypes[type])
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
            throw new ValidationAPIError({image: {message: "incorrect aspect ratio"}});
    }
}