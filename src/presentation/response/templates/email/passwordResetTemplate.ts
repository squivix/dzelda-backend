import {BASE_URL, DOMAIN_NAME} from "@/src/constants.js";
import {commonEmailTemplate} from "@/src/presentation/response/templates/email/commonSnippets.js";

export function passwordResetTemplate(toEmail: string, params: { token: string }) {
    const subject = "Password Reset";
    const resetUrl = `${BASE_URL}/reset-password?token=${params.token}`;
    return {
        from: `Dzelda <security@${DOMAIN_NAME}>`,
        to: toEmail,
        subject: subject,
        text: `We received a request to reset your password. If this was done by you, you can reset your password within the next 24 hours by going to the following URL:\n\n${resetUrl}\n\nIf this was not done by you, please ignore this email.`,
        html: commonEmailTemplate(subject, `
            <p>We received a request to reset your password. If this was done by you, you can reset your password within the next 24 hours by clicking here:</p>
            <button class="link-button">
                <a href="${resetUrl}" class="inv-link">
                    Reset Password
                </a>
            </button>
            
            <p>Or go to the URL:<br><br>
                <a href="${resetUrl}">${resetUrl}</a>
            </p>            
            <p>If this was not done by you, please ignore this email.</p>
        `),
    };
}
