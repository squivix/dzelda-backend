import {Faker} from "@mikro-orm/seeder";
import {EntityData} from "@mikro-orm/core";
import {CustomFactory} from "@/src/seeders/factories/CustomFactory.js";
import {FileUploadRequest} from "@/src/models/entities/FileUploadRequest.js";

export class FileUploadRequestFactory extends CustomFactory<FileUploadRequest> {
    readonly model = FileUploadRequest;

    protected definition(faker: Faker): EntityData<FileUploadRequest> {
        return {
            objectKey: faker.random.alpha(20),
            fileUrl: faker.internet.url(),
        };
    }
}
