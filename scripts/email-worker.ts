import { deliverEmailBatch } from "../src/lib/hosted/email";
import { hostedDb } from "../src/lib/hosted/db";
let running = true;
process.on("SIGINT", () => {
  running = false;
});
process.on("SIGTERM", () => {
  running = false;
});
async function main() {
  while (running) {
    try {
      const count = await deliverEmailBatch();
      if (count)
        console.info(JSON.stringify({ event: "email_batch_delivered", count }));
    } catch {
      console.error(JSON.stringify({ event: "email_batch_failed" }));
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  await hostedDb().$disconnect();
}
void main();
