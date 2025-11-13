import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyBaseLogger } from "fastify";
import nodemailer from "nodemailer";

export interface MailerOptions {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
  devInbox?: string;
}

export interface Mailer {
  sendOtpEmail(options: { to: string; code: string }): Promise<void>;
}

export function createMailer(options: MailerOptions, log: FastifyBaseLogger): Mailer {
  const smtpEnabled = Boolean(options.host && options.user && options.pass && options.from);
  const transporter = smtpEnabled
    ? nodemailer.createTransport({
        host: options.host,
        port: options.port ?? 587,
        secure: (options.port ?? 587) === 465,
        auth: {
          user: options.user!,
          pass: options.pass!,
        },
      })
    : null;

  const devInbox = options.devInbox ? path.resolve(options.devInbox) : null;

  if (!smtpEnabled) {
    if (devInbox) {
      log.warn({ devInbox }, "SMTP credentials missing; writing OTP messages to dev inbox");
    } else {
      log.warn("SMTP credentials missing; OTP emails will be logged only");
    }
  }

  async function deliver(message: { to: string; subject: string; text: string; html: string }) {
    if (transporter) {
      await transporter.sendMail({
        from: options.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      return;
    }

    if (devInbox) {
      await fs.mkdir(devInbox, { recursive: true });
      const filename = `mail-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
      const filePath = path.join(devInbox, filename);
      await fs.writeFile(
        filePath,
        JSON.stringify({ ...message, sentAt: new Date().toISOString() }, null, 2),
        "utf8",
      );
      log.info({ to: message.to, filePath }, "OTP email written to dev inbox");
      return;
    }

    log.info({ to: message.to }, "OTP email (simulation)");
    log.debug({ to: message.to, text: message.text }, "OTP email content");
  }

  return {
    async sendOtpEmail({ to, code }: { to: string; code: string }) {
      const subject = "Your Retrace login code";
      const text = `Use this code to finish signing in: ${code}\n\nIt expires in 10 minutes.`;
      const html = `<p>Use this code to finish signing in:</p><p style="font-size:24px;font-weight:bold;margin:16px 0">${code}</p><p>This code expires in 10 minutes.</p>`;
      await deliver({ to, subject, text, html });
    },
  };
}
