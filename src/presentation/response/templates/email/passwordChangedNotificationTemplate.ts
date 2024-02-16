import {BASE_URL, DOMAIN_NAME} from "@/src/constants.js";
import {commonEmailTemplate} from "@/src/presentation/response/templates/email/commonSnippets.js";

export function passwordChangedNotificationTemplate(toEmail: string) {
    const subject = "Your password was changed";
    const resetUrl = `${BASE_URL}/reset-password-request/`;
    return {
        from: `Dzelda <security@${DOMAIN_NAME}>`,
        to: toEmail,
        subject: subject,
        text: `Your password was changed. If this wasn't done by you, please reset your password at the following URL:\n\n${resetUrl}`,
        html: commonEmailTemplate(subject, `
            <p>Your password was changed. If this was not done by you, please reset your password at the following URL:<br><br>
                <a href="${resetUrl}">${resetUrl}</a>
            </p>
        `),
    };
}
