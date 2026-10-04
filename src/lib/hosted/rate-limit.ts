import { createHash } from "node:crypto";
import { hostedDb } from "./db";

// One atomic PostgreSQL statement shared by every application instance.
export async function consumeLimit(
  identifier: string,
  rule: { window: number; max: number },
) {
  const key = createHash("sha256").update(identifier).digest("hex");
  const rows = await hostedDb().$queryRaw<
    Array<{ count: number; retry: number }>
  >`
    INSERT INTO v2_rate_buckets ("key", "count", "expiresAt")
    VALUES (${key}, 1, NOW() + ${rule.window} * INTERVAL '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN v2_rate_buckets."expiresAt" <= NOW() THEN 1 ELSE v2_rate_buckets."count" + 1 END,
      "expiresAt" = CASE WHEN v2_rate_buckets."expiresAt" <= NOW() THEN NOW() + ${rule.window} * INTERVAL '1 second' ELSE v2_rate_buckets."expiresAt" END
    RETURNING "count", CEIL(EXTRACT(EPOCH FROM ("expiresAt" - NOW())))::int AS retry`;
  return {
    allowed: rows[0].count <= rule.max,
    retryAfter: rows[0].count > rule.max ? Math.max(1, rows[0].retry) : null,
  };
}
