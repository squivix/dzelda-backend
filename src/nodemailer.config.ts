import nodemailer from "nodemailer";
import process from "process";

let config: any;
if (process.env.NODE_ENV == "prod") {
    config = {
        host: process.env.SMTP_HOST,
        secure: true,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USERNAME,
            pass: process.env.SMTP_PASSWORD
        },
    };
} else {
    // Mailhog mock server accessed at http://localhost:8025
    config = {
        host: process.env.EMAIL_SERVER_HOST ?? "localhost",
        port: 1025,
    };
}
export const emailTransporter = nodemailer.createTransport(config);
