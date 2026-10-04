import nodemailer from "nodemailer";
import { hostedConfig } from "./config";
import { hostedDb } from "./db";
import { decryptSecret, encryptSecret } from "./encryption";

export async function queueEmail(to: string, subject: string, text: string) {
  await hostedDb().emailOutbox.create({
    data: { to, subject, text: encryptSecret(text) },
  });
}

// Durable at-least-once delivery. A lease lets another worker recover after a crash.
export async function deliverEmailBatch(limit = 20) {
  const db = hostedDb();
  const config = hostedConfig();
  const transport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    requireTLS: process.env.HOSTED_LOCAL !== "true" && config.smtpPort !== 465,
    connectionTimeout: 10000,
    socketTimeout: 15000,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  let delivered = 0;
  for (let index = 0; index < limit; index++) {
    const rows = await db.$queryRaw<
      Array<{
        id: string;
        to: string;
        subject: string;
        text: string;
        attempts: number;
      }>
    >`
      UPDATE v2_email_outbox SET "lockedAt" = NOW(), "attempts" = "attempts" + 1
      WHERE id = (SELECT id FROM v2_email_outbox WHERE "sentAt" IS NULL AND "availableAt" <= NOW()
        AND "attempts" < 6 AND ("lockedAt" IS NULL OR "lockedAt" < NOW() - INTERVAL '2 minutes')
        ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1)
      RETURNING id, "to", subject, text, attempts`;
    const email = rows[0];
    if (!email) break;
    try {
      await transport.sendMail({
        from: config.emailFrom,
        to: email.to,
        subject: email.subject,
        text: decryptSecret(email.text),
        messageId: `<${email.id}@${new URL(config.origin).hostname}>`,
      });
      await db.emailOutbox.update({
        where: { id: email.id },
        data: { sentAt: new Date(), lockedAt: null, text: "", lastError: null },
      });
      delivered++;
    } catch {
      await db.emailOutbox.update({
        where: { id: email.id },
        data: {
          lockedAt: null,
          lastError:
            "Delivery failed; inspect SMTP connectivity and credentials.",
          availableAt: new Date(
            Date.now() + 1000 * Math.min(3600, 2 ** email.attempts * 15),
          ),
        },
      });
    }
  }
  return delivered;
}
