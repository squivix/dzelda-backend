import {File} from "fastify-formidable";
import {validateFileSize, validateFileType, validateImageAspectRatio} from "@/src/validators/fileValidator.js";
import {z} from "zod";

export const lessonTitleValidator = z.string().min(1).max(124);
export const lessonTextValidator = z.string().min(1).max(50_000);

export async function lessonImageValidator(imageFile?: File) {
    const FIELD_NAME = "image";
    if (imageFile) {
        await validateFileType(imageFile, FIELD_NAME, "image");
        await validateFileSize(imageFile, FIELD_NAME, 500);
        await validateImageAspectRatio(imageFile, FIELD_NAME, 1, 1);
    }
}

export async function lessonAudioValidator(audioFile?: File) {
    const FIELD_NAME = "audio";
    if (audioFile) {
        await validateFileType(audioFile, FIELD_NAME, "audio");
        await validateFileSize(audioFile, FIELD_NAME, 100 * 1024);
    }
}
