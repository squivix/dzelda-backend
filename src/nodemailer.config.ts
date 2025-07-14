import nodemailer, {Transporter} from "nodemailer";
import process from "process";
import {Resend} from "resend";

let resend: Resend, localMailTransporter: Transporter;
if (process.env.NODE_ENV == "prod")
    resend = new Resend(process.env.SMTP_PASSWORD);
else
    localMailTransporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST ?? "localhost",
        port: 1025,
    });
export const emailTransporter = {
    async sendMail(options: { from: string, to: string, subject: string, text: string, html: string }) {
        if (process.env.NODE_ENV == "prod")
            await resend.emails.send(options);
        else
            await localMailTransporter.sendMail(options)
    }
}