import {File} from "fastify-formidable";
import {validateFileSize, validateFileType, validateImageAspectRatio} from "@/src/validators/fileValidator.js";
import {z} from "zod";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";

export const lessonTitleValidator = z.string().min(1).max(124);
export const lessonTextValidator = z.string().min(1).max(50_000);
export const lessonLevelValidator = z.nativeEnum(LanguageLevel);
export const lessonLevelsFilterValidator = z.nativeEnum(LanguageLevel).transform(l => [l]).or(z.array(z.nativeEnum(LanguageLevel)))

export async function lessonImageValidator(imageFile?: File) {
    const FIELD_NAME = "image";
    if (imageFile) {
        await validateFileType(imageFile, FIELD_NAME, "image");
        validateFileSize(imageFile, FIELD_NAME, 500);
        validateImageAspectRatio(imageFile, FIELD_NAME, 1, 1);
    }
}

export async function lessonAudioValidator(audioFile?: File) {
    const FIELD_NAME = "audio";
    if (audioFile) {
        await validateFileType(audioFile, FIELD_NAME, "audio");
        validateFileSize(audioFile, FIELD_NAME, 100 * 1024);
    }
}
