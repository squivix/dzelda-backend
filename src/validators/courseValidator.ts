import {z} from "zod";
import {validateFileSize, validateFileType, validateImageAspectRatio} from "@/src/validators/fileValidator.js";
import {File} from "fastify-formidable";

export const courseTitleValidator = z.string().min(1).max(255);
export const courseDescriptionValidator = z.string().max(500);

export async function courseImageValidator(imageFile?: File) {
    const FIELD_NAME = "image";
    if (imageFile) {
        await validateFileType(imageFile, FIELD_NAME, "image");
        await validateFileSize(imageFile, FIELD_NAME, 500);
        await validateImageAspectRatio(imageFile, FIELD_NAME, 1, 1);
    }
}