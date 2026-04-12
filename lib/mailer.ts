/**
 * Shared mailer using Brevo SMTP relay.
 *
 * Required env vars:
 *   BREVO_SMTP_USER — your Brevo account email
 *   BREVO_SMTP_KEY  — SMTP key from Brevo → Transactional → Settings → SMTP & API
 *   FROM_EMAIL      — verified sender address (e.g. minutemenus@outlook.com)
 */

import nodemailer from "nodemailer";

export interface MailOptions {
    from: string;
    replyTo?: string;
    to: string;
    subject: string;
    html: string;
}

export async function sendMail(options: MailOptions): Promise<void> {
    if (!process.env.BREVO_SMTP_KEY) {
        console.warn("mailer: BREVO_SMTP_KEY not set — skipping email send");
        return;
    }
    const transporter = nodemailer.createTransport({
        host: "smtp-relay.brevo.com",
        port: 587,
        secure: false,
        auth: {
            user: process.env.BREVO_SMTP_USER,
            pass: process.env.BREVO_SMTP_KEY,
        },
    });
    await transporter.sendMail({
        from: options.from,
        replyTo: options.replyTo,
        to: options.to,
        subject: options.subject,
        html: options.html,
    });
}
