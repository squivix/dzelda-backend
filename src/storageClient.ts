import {S3} from "@aws-sdk/client-s3";

export const s3Client = new S3({
    forcePathStyle: false, // Configures to use subdomain/virtual calling format.
    endpoint: process.env.SPACES_ENDPOINT!,
    region: process.env.SPACES_REGION!,
    credentials: {
        accessKeyId: process.env.SPACES_ACCESS_KEY!,
        secretAccessKey: process.env.SPACES_SECRET_KEY!
    }
});
