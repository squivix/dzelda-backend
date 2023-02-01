import {z} from "zod";
import {validateFileMimeType, validateFileSize, validateImageAspectRatio} from "@/src/validators/fileValidator.js";
import {File} from "fastify-formidable";

export const courseTitleValidator = z.string().min(1).max(255);
export const courseDescriptionValidator = z.string().max(500);

export function courseImageValidator(imageFile?: File) {
    if (imageFile) {
        validateFileMimeType(imageFile, "image", "image");
        validateFileSize(imageFile, "image", 500)
        validateImageAspectRatio(imageFile, "image", 1, 1);
    }
}