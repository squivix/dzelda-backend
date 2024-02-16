import {BASE_URL, DOMAIN_NAME} from "@/src/constants.js";
import {commonEmailTemplate} from "@/src/presentation/response/templates/email/commonSnippets.js";

export function confirmEmailTemplate(toEmail: string, params: { token: string }) {
    const subject = "Confirm Email";
    const confirmUrl = `${BASE_URL}/confirm-email?token=${params.token}`;
    return {
        from: `Dzelda <security@${DOMAIN_NAME}>`,
        to: toEmail,
        subject: subject,
        text: `Please confirm your email within the next 24 hours by going to the following URL:\n\n${confirmUrl}`,
        html: commonEmailTemplate(subject, `
        <p>Please confirm your email within the next 24 hours by clicking here:</p>
        <button class="link-button">
            <a href="${confirmUrl}" class="inv-link">
                Confirm Email
            </a>
        </button>

        <p>Or go to the URL:<br><br>
            <a href="${confirmUrl}">${confirmUrl}</a>
        </p>
        `),
    };
}
