import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    mode: { type: "string", default: "demo" },
    output: { type: "string", default: ".env.local" },
  },
});
if (!["demo", "hosted"].includes(values.mode))
  throw new Error("Use --mode demo or --mode hosted.");
const settings =
  values.mode === "hosted"
    ? {
        HOSTED_ENABLED: "true",
        HOSTED_LOCAL: "true",
        BETTER_AUTH_URL: "http://localhost:3302",
        NEXT_PUBLIC_APP_URL: "http://localhost:3302",
        FINSIGHT_PORT: "3302",
        BETTER_AUTH_SECRET: randomBytes(48).toString("base64url"),
        POSTGRES_PASSWORD: randomBytes(32).toString("hex"),
        SMTP_HOST: "mailpit",
        SMTP_PORT: "1025",
        EMAIL_FROM: "FinSight Local <hello@example.test>",
      }
    : {};
const content = readFileSync(".env.example", "utf8").replace(
  /^([A-Z_]+)="[^"]*"/gm,
  (line, name) => (name in settings ? `${name}="${settings[name]}"` : line),
);
mkdirSync(dirname(values.output), { recursive: true, mode: 0o700 });
writeFileSync(values.output, content, { mode: 0o600, flag: "wx" });
console.info(
  `Created ${values.output} with fresh local credentials. Hosted output is for loopback testing; replace domain, SMTP and operator details before production.`,
);
