import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { loadConfig } =
  require("../apps/api/src/config.ts") as typeof import("../apps/api/src/config");
const { decryptSecret, encryptSecret, encryptionKeyId } =
  require("../apps/api/src/encryption.ts") as typeof import("../apps/api/src/encryption");
const { connectMongo, disconnectMongo, getDb } =
  require("../apps/api/src/mongo.ts") as typeof import("../apps/api/src/mongo");

export async function rekeyEncryptedFields() {
  const prefix = `v2.${encryptionKeyId(loadConfig().FIELD_ENCRYPTION_KEY)}.`;
  const inventory = [
    {
      collection: "email_outbox",
      field: "body",
      purpose: (_row: Record<string, unknown>) => "email",
    },
    {
      collection: "billingaccounts",
      field: "profile",
      purpose: (row: Record<string, unknown>) => `billing-profile:${row._id}`,
    },
    {
      collection: "billingsubscriptions",
      field: "parties",
      purpose: (row: Record<string, unknown>) =>
        `billing-subscription:${row._id}`,
    },
    {
      collection: "billinginvoices",
      field: "parties",
      purpose: (row: Record<string, unknown>) =>
        `billing-invoice:${row.paymentId}`,
    },
  ];
  const result: Record<
    string,
    { changed: number; current: number; conflicted: number }
  > = {};
  for (const item of inventory) {
    const stats = { changed: 0, current: 0, conflicted: 0 };
    const collection = getDb().collection(item.collection);
    for await (const row of collection
      .find({ [item.field]: { $type: "string", $ne: "" } })
      .batchSize(100)) {
      const previous = row[item.field] as string;
      const purpose = item.purpose(row);
      if (previous.startsWith(prefix)) {
        decryptSecret(previous, purpose);
        stats.current++;
        continue;
      }
      const replacement = encryptSecret(
        decryptSecret(previous, purpose),
        purpose,
      );
      // Compare-and-set protects a profile edit or cleared email body during rotation.
      const write = await collection.updateOne(
        { _id: row._id, [item.field]: previous },
        { $set: { [item.field]: replacement } },
      );
      if (write.modifiedCount) stats.changed++;
      else stats.conflicted++;
    }
    result[item.collection] = stats;
  }
  return result;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    await connectMongo();
    const collections = await rekeyEncryptedFields();
    console.info(JSON.stringify({ event: "fields_rekeyed", collections }));
    if (Object.values(collections).some((row) => row.conflicted))
      process.exitCode = 2;
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Field rotation failed.",
    );
    process.exitCode = 1;
  } finally {
    await disconnectMongo();
  }
}
