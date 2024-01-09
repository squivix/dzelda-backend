import {File} from "fastify-formidable";
import {validateFileSize, validateFileType, validateImageAspectRatio} from "@/src/validators/fileValidator.js";
import {z} from "zod";
import {kibiBytes} from "@/tests/integration/utils.js";

export async function profilePictureValidator(imageFile?: File) {
    const FIELD_NAME = "profilePicture";
    if (imageFile) {
        await validateFileType(imageFile, FIELD_NAME, "image");
        validateFileSize(imageFile, FIELD_NAME, kibiBytes(500));
        validateImageAspectRatio(imageFile, FIELD_NAME, 1, 1);
    }
}

export const bioValidator = z.string().max(255, "Bio must be no longer than 255 characters");
