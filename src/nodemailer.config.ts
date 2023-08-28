import nodemailer from "nodemailer";

export const emailTransporter = nodemailer.createTransport({
    host: "localhost",
    port: 1025,
    // secure: true,
    // security: {
    //     user: "REPLACE-WITH-YOUR-ALIAS@YOURDOMAIN.COM",
    //     pass: "REPLACE-WITH-YOUR-GENERATED-PASSWORD"
    // }
});
