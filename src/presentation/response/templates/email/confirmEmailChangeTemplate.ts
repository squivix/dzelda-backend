import {DOMAIN_NAME} from "@/src/constants.js";

export function confirmEmailChangeTemplate(toEmail: string, params: { token: string }) {
    return {
        from: `Dzelda <security@${DOMAIN_NAME}>`,
        to: toEmail,
        subject: "Confirm New Email",
        text: `Confirm your new email by going to the following link:\nhttps://${DOMAIN_NAME}/confirm-email?token=${params.token}`,
        html: `<b>Confirm New Email Here: https://${DOMAIN_NAME}/confirm-email?token=${params.token}</b>`,
    };
}
