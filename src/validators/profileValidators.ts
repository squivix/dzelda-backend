import {File} from "fastify-formidable";
import {validateFileSize, validateFileType, validateImageAspectRatio} from "@/src/validators/fileValidator.js";
import {z} from "zod";

export async function profilePictureValidator(imageFile?: File) {
    const FIELD_NAME = "profilePicture";
    if (imageFile) {
        await validateFileType(imageFile, FIELD_NAME, "image");
        validateFileSize(imageFile, FIELD_NAME, 500);
        validateImageAspectRatio(imageFile, FIELD_NAME, 1, 1);
    }
}

export const bioValidator = z.string().max(255);