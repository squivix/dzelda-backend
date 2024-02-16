import {BASE_URL, DOMAIN_NAME} from "@/src/constants.js";
import {commonEmailTemplate} from "@/src/presentation/response/templates/email/commonSnippets.js";

export function confirmEmailChangeTemplate(toEmail: string, params: { token: string }) {
    const subject = "Confirm New Email";
    const confirmUrl = `${BASE_URL}/confirm-email?token=${params.token}`;
    return {
        from: `Dzelda <security@${DOMAIN_NAME}>`,
        to: toEmail,
        subject: subject,
        text: `We received a request to change your account email. If this was done by you, please confirm your new email within the next 24 hours by going to the following URL:\n\n${confirmUrl}\n\nIf this was not done by you, please ignore this email.`,
        html: commonEmailTemplate(subject,
            `
            <p>We received a request to change your account email. If this was done by you, please confirm your new email within the next 24 hours by clicking here:</p>
            <button class="link-button">
                <a href="${confirmUrl}" class="inv-link">
                    Confirm Email
                </a>
            </button>
    
            <p>Or go to the URL:<br><br>
                <a href="${confirmUrl}">${confirmUrl}</a>
            </p>
            <p>If this was not done by you, please ignore this email.</p>
            `)
    };
}
