import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    mode: { type: "string", default: "local" },
    output: { type: "string", default: ".env" },
  },
});
if (!["local", "production"].includes(values.mode))
  throw new Error("Use --mode local or --mode production.");
const settings =
  values.mode === "local"
    ? {
        HOSTED_LOCAL: "true",
        API_URL: "http://localhost:4000",
        API_ORIGIN: "http://localhost:4000",
        WEB_ORIGIN: "http://localhost:3000",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        BETTER_AUTH_SECRET: randomBytes(48).toString("base64url"),
        FIELD_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
        FIELD_ENCRYPTION_PREVIOUS_KEYS: "[]",
        MONGODB_URI:
          "mongodb://localhost:27017/finsight?replicaSet=rs0&directConnection=true",
        REDIS_URL: "redis://localhost:6379",
        SMTP_HOST: "localhost",
        SMTP_PORT: "1025",
        EMAIL_FROM: "FinSight Local <hello@example.test>",
      }
    : {
        BETTER_AUTH_SECRET: randomBytes(48).toString("base64url"),
        FIELD_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
        FIELD_ENCRYPTION_PREVIOUS_KEYS: "[]",
        NODE_ENV: "production",
        HOSTED_LOCAL: "false",
      };
const content = readFileSync(".env.example", "utf8").replace(
  /^([A-Z_]+)="[^"]*"/gm,
  (line, name) => (name in settings ? `${name}="${settings[name]}"` : line),
);
mkdirSync(dirname(values.output), { recursive: true, mode: 0o700 });
writeFileSync(values.output, content, { mode: 0o600, flag: "wx" });
console.info(
  `Created ${values.output} with fresh local credentials. Hosted output is for loopback testing; replace domain, SMTP and operator details before production.`,
);
