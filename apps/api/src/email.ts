import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { getDb } from "./mongo";
import { loadConfig } from "./config";
import { decryptSecret, encryptSecret } from "./encryption";
import { nativeOptions } from "./repositories/unit-of-work";

let queue: Queue | undefined;
let queueConnection: Redis | undefined;
export function emailQueue() {
  queueConnection ??= new Redis(loadConfig().REDIS_URL, {
    maxRetriesPerRequest: null,
  });
  return (queue ??= new Queue("finsight-email", {
    connection: queueConnection as never,
    defaultJobOptions: {
      attempts: 6,
      backoff: { type: "exponential", delay: 15_000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  }));
}
export async function queueEmail(
  to: string,
  subject: string,
  text: string,
  workspaceId?: string,
) {
  const id = randomUUID();
  await getDb()
    .collection("email_outbox")
    .insertOne(
      {
        _id: id as never,
        to,
        subject,
        body: encryptSecret(text),
        workspaceId,
        createdAt: new Date(),
        sentAt: null,
        expiresAt: new Date(Date.now() + 30 * 86_400_000),
      },
      nativeOptions(),
    );
  return id;
}
export async function dispatchEmails() {
  const rows = await getDb()
    .collection("email_outbox")
    .find(
      { sentAt: null, expiresAt: { $gt: new Date() } },
      { projection: { _id: 1 }, limit: 100 },
    )
    .toArray();
  for (const row of rows)
    await emailQueue().add(
      "deliver",
      { id: String(row._id) },
      { jobId: String(row._id) },
    );
}
export function startEmailWorker() {
  const config = loadConfig();
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    requireTLS: config.HOSTED_LOCAL !== "true" && config.SMTP_PORT !== 465,
    auth: config.SMTP_USER
      ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  });
  const workerConnection = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
  const worker = new Worker(
    "finsight-email",
    async (job) => {
      const outbox = getDb().collection("email_outbox");
      const row = await outbox.findOne({ _id: job.data.id, sentAt: null });
      if (!row || row.expiresAt < new Date()) return;
      await transport.sendMail({
        from: config.EMAIL_FROM,
        to: row.to,
        subject: row.subject,
        text: decryptSecret(row.body),
        messageId: `<${job.data.id}@${new URL(config.WEB_ORIGIN).hostname}>`,
      });
      await outbox.updateOne(
        { _id: job.data.id, sentAt: null },
        {
          $set: {
            body: "",
            sentAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 86_400_000),
          },
        },
      );
    },
    {
      connection: workerConnection as never,
      concurrency: 5,
    },
  );
  let dispatching: Promise<void> | undefined;
  const dispatch = () => {
    if (dispatching) return;
    dispatching = dispatchEmails()
      .catch((error: unknown) =>
        console.error(
          JSON.stringify({
            event: "email_dispatch_failed",
            message: error instanceof Error ? error.message : "Unknown error",
          }),
        ),
      )
      .finally(() => {
        dispatching = undefined;
      });
  };
  dispatch();
  const poller = setInterval(dispatch, 15_000);
  return {
    running: () => worker.isRunning(),
    close: async () => {
      clearInterval(poller);
      await dispatching;
      await worker.close();
      if (queue) await queue.close();
      transport.close();
      await workerConnection.quit().catch(() => workerConnection.disconnect());
      if (queueConnection)
        await queueConnection.quit().catch(() => queueConnection?.disconnect());
      queue = undefined;
      queueConnection = undefined;
    },
  };
}
