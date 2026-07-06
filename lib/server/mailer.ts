/** Server-only mailer (inlined for Vercel — do not import from browser code). */

import nodemailer from "nodemailer";
import { createLogger } from "./logger";

const log = createLogger("mailer");

export interface MailOptions {
    from: string;
    replyTo?: string;
    to: string;
    subject: string;
    html: string;
}

export async function sendMail(options: MailOptions): Promise<void> {
    if (!process.env.BREVO_SMTP_KEY) {
        log.warn("BREVO_SMTP_KEY not set — skipping email send");
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
