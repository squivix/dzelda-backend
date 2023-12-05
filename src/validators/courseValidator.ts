import {z} from "zod";
import {validateFileSize, validateFileType, validateImageAspectRatio} from "@/src/validators/fileValidator.js";
import {File} from "fastify-formidable";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";

export const courseTitleValidator = z.string().min(1, "Title must be between 1 and 255 characters long").max(255, "Title must be between 1 and 255 characters long");
export const courseDescriptionValidator = z.string().max(500, "Description must be no longer than 500 characters");
export const courseLevelValidator = z.nativeEnum(LanguageLevel);
export const courseLevelsFilterValidator = z.nativeEnum(LanguageLevel).transform(l => [l]).or(z.array(z.nativeEnum(LanguageLevel)));

export async function courseImageValidator(imageFile?: File) {
    const FIELD_NAME = "image";
    if (imageFile) {
        await validateFileType(imageFile, FIELD_NAME, "image");
        validateFileSize(imageFile, FIELD_NAME, 500);
        validateImageAspectRatio(imageFile, FIELD_NAME, 1, 1);
    }
}
