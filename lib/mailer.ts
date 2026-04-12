/**
 * Shared SMTP mailer using Microsoft Outlook (minutemenus@outlook.com).
 * Host: smtp-mail.outlook.com, Port: 587, STARTTLS.
 *
 * Required env vars:
 *   SMTP_USER  — e.g. minutemenus@outlook.com
 *   SMTP_PASS  — Outlook account password (or app password if 2FA enabled)
 */

import nodemailer from "nodemailer";

export interface MailOptions {
    from: string;
    replyTo?: string;
    to: string;
    subject: string;
    html: string;
}

function createTransport() {
    return nodemailer.createTransport({
        host: "smtp-mail.outlook.com",
        port: 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER ?? "",
            pass: process.env.SMTP_PASS ?? "",
        },
        tls: { ciphers: "SSLv3" },
    });
}

export async function sendMail(options: MailOptions): Promise<void> {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("mailer: SMTP_USER / SMTP_PASS not set — skipping email send");
        return;
    }
    const transporter = createTransport();
    await transporter.sendMail(options);
}
