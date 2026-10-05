import { deliverEmailBatch } from "../src/lib/hosted/email";
import { hostedDb } from "../src/lib/hosted/db";
import { hostedConfig, validateEnvironment } from "../src/lib/hosted/config";
import { writeFile } from "node:fs/promises";
let running = true;
process.on("SIGINT", () => {
  running = false;
});
process.on("SIGTERM", () => {
  running = false;
});
async function main() {
  validateEnvironment();
  hostedConfig();
  let lastCleanup = 0;
  while (running) {
    try {
      const count = await deliverEmailBatch();
      if (count)
        console.info(JSON.stringify({ event: "email_batch_delivered", count }));
      await writeFile(
        "/tmp/finsight-email-worker-heartbeat",
        String(Date.now()),
        { mode: 0o600 },
      );
      if (Date.now() - lastCleanup > 60 * 60 * 1000) {
        const db = hostedDb();
        await db.rateBucket.deleteMany({
          where: { expiresAt: { lt: new Date() } },
        });
        await db.verification.deleteMany({
          where: { expiresAt: { lt: new Date() } },
        });
        await db.idempotentWrite.deleteMany({
          where: { createdAt: { lt: new Date(Date.now() - 30 * 86_400_000) } },
        });
        await db.emailOutbox.deleteMany({
          where: {
            OR: [
              { sentAt: { lt: new Date(Date.now() - 7 * 86_400_000) } },
              {
                createdAt: { lt: new Date(Date.now() - 30 * 86_400_000) },
                attempts: { gte: 6 },
              },
            ],
          },
        });
        lastCleanup = Date.now();
      }
    } catch {
      console.error(JSON.stringify({ event: "email_batch_failed" }));
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  await hostedDb().$disconnect();
}
void main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
