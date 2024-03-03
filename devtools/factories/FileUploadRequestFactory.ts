import {EntityData} from "@mikro-orm/core";
import {CustomFactory} from "@/devtools/factories/CustomFactory.js";
import {FileUploadRequest} from "@/src/models/entities/FileUploadRequest.js";
import {faker} from "@faker-js/faker";

export class FileUploadRequestFactory extends CustomFactory<FileUploadRequest> {
    readonly model = FileUploadRequest;

    protected definition(): EntityData<FileUploadRequest> {
        return {
            objectKey: faker.random.alpha(20),
            fileUrl: faker.internet.url(),
        };
    }
}
