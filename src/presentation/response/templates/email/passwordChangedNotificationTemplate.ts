import {DOMAIN_NAME} from "@/src/constants.js";

export function passwordChangedNotificationTemplate(toEmail: string) {
    return {
        from: `Dzelda <security@${DOMAIN_NAME}>`,
        to: toEmail,
        subject: "Your password was changed",
        text: `Your password was recently changed. If this wasn't you please reset it here: https://${DOMAIN_NAME}/reset-password-request/`,
        html: `<b>Your password was recently changed. If this wasn't you please reset it here: https://${DOMAIN_NAME}/reset-password-request/</b>`,
    };
}
