import {UserService} from "@/src/services/UserService.js";
import {User} from "@/src/models/entities/auth/User.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {FileFieldType} from "@/src/validators/fileValidator.js";

export async function validateFileObjectKey(userService: UserService, user: User, objectKey: string, fileField: keyof FileFieldType, errorField: string) {
    const fileUploadRequest = await userService.findFileUploadRequest({user: user, objectKey: objectKey, fileField: fileField});
    if (!fileUploadRequest)
        throw new ValidationAPIError({[errorField]: "no upload requested"});

    const fileUrl = fileUploadRequest.fileUrl;
    await userService.deleteFileUploadRequest(fileUploadRequest);

    if (fileUploadRequest.isExpired)
        throw new ValidationAPIError({[errorField]: "upload request expired"});
    else
        return fileUrl;
}
