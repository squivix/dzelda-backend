import {DOMAIN_NAME} from "@/src/constants.js";

export function passwordResetTemplate(toEmail: string, params: { token: string }) {
    return {
        from: `Dzelda <security@${DOMAIN_NAME}>`,
        to: toEmail,
        subject: "Password Reset Link",
        text: `Password Reset Here: https://${DOMAIN_NAME}/reset-password?token=${params.token}`,
        html: `<b>Password Reset Here: https://${DOMAIN_NAME}/reset-password?token=${params.token}</b>`,
    };
}
