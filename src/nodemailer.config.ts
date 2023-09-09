import nodemailer from "nodemailer";

export const emailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT),
    // TODO: setup TLS
    // secure: true,
    // security: {
    //     user: "REPLACE-WITH-YOUR-ALIAS@YOURDOMAIN.COM",
    //     pass: "REPLACE-WITH-YOUR-GENERATED-PASSWORD"
    // }
});
