import nodemailer from "nodemailer";
import aws from "@aws-sdk/client-ses";

let config:any;
if (process.env.NODE_ENV == "prod") {
    config = {
        SES: {
            ses: new aws.SES({
                region: process.env.EMAIL_REGION!,
                credentials: {
                    accessKeyId: process.env.EMAIL_ACCESS_KEY!,
                    secretAccessKey: process.env.EMAIL_SECRET_KEY!
                }
            }),
            aws
        },
    };
} else {
    // Mailhog mock server accessed at http://localhost:8025
    config = {
        host: "localhost",
        port: 1025,
    };
}
export const emailTransporter = nodemailer.createTransport(config);
