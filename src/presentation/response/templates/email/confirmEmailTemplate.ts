import {DOMAIN_NAME} from "@/src/constants.js";

export function confirmEmailTemplate(toEmail: string, params: { token: string }) {
    return {
        from: `Dzelda <security@${DOMAIN_NAME}>`,
        to: toEmail,
        subject: "Confirm Email",
        text: `Confirm Email Here: https://${DOMAIN_NAME}/confirm-email?token=${params.token}`,
        html: `<b>Confirm Email Here: https://${DOMAIN_NAME}/confirm-email?token=${params.token}</b>`,
    };
}
