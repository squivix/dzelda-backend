import {File} from "fastify-formidable";
import {FilesTooLargeAPIError} from "@/src/utils/errors/FilesTooLargeAPIError.js";
import {kibiBytes, mebiBytes} from "@/tests/integration/utils.js";

export function validateFileSize(file: File, fieldName: string, sizeInBytes: number) {
    if (file.size > sizeInBytes)
        throw new FilesTooLargeAPIError({field: fieldName, maxSizeInBytes: sizeInBytes});
}


const fileMimeTypes = {
    image: ["image/jpeg", "image/png"],

    audio: ["audio/wav", "audio/wave", "audio/vnd.wave", "audio/mpeg", "application/ogg"]
};

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
