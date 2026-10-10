import { readFileSync } from "node:fs";
import { parseArgs, parseEnv } from "node:util";
import { pathToFileURL } from "node:url";

export type Level = "pass" | "warn" | "fail";
export type Finding = { level: Level; check: string; message: string };
export type Environment = Record<string, string | undefined>;

const PLACEHOLDER_HOST =
  /(^|\.)(example\.(com|org|net)|example|test|invalid|local|localhost|finsight\.local)$/i;
const PLACEHOLDER_NAMES = new Set([
  "",
  "tbd",
  "todo",
  "name",
  "your name",
  "local operator",
  "operator",
  "change me",
  "changeme",
  "example",
  "test",
]);
const KNOWN_DEFAULT_SECRET =
  /change[-_ ]?me|local-development-secret|default[-_ ]?secret|your[-_ ]?secret/i;
const HEX_KEY = /^[a-fA-F0-9]{64}$/;
const BILLING_FIELDS = [
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "RAZORPAY_PRO_PLAN_ID",
  "RAZORPAY_BUSINESS_PLAN_ID",
  "BILLING_BUSINESS_NAME",
  "BILLING_BUSINESS_ADDRESS",
  "BILLING_GSTIN",
  "BILLING_STATE_CODE",
  "BILLING_SAC",
] as const;

const read = (env: Environment, name: string) => {
  const value = env[name]?.trim();
  return value ? value : undefined;
};

function isLoopback(host: string) {
  const name = host.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    name === "localhost" ||
    name === "::1" ||
    name === "0.0.0.0" ||
    /^127\./.test(name)
  );
}

function isPrivateHost(host: string) {
  const name = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (isLoopback(name)) return false;
  return (
    !name.includes(".") ||
    /\.(internal|local|lan|svc|cluster\.local)$/.test(name) ||
    /^10\./.test(name) ||
    /^192\.168\./.test(name) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(name) ||
    /^f[cd][0-9a-f]{2}:/.test(name)
  );
}

function parseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

function parseMongoUri(uri: string) {
  const match = uri.match(
    /^(mongodb(?:\+srv)?):\/\/(?:([^:@/]+)(?::([^@/]*))?@)?([^/?]+)(?:\/([^?]*))?(?:\?(.*))?$/,
  );
  if (!match) return undefined;
  return {
    scheme: match[1],
    user: match[2],
    password: match[3],
    hosts: match[4].split(",").map((host) => host.replace(/:\d+$/, "")),
    database: match[5],
    params: new URLSearchParams(match[6] ?? ""),
  };
}

export function evaluateEnvironment(env: Environment): Finding[] {
  const findings: Finding[] = [];
  const add = (level: Level, check: string, message: string) =>
    findings.push({ level, check, message });
  const requireOrigin = (name: string) => {
    const raw = read(env, name);
    if (!raw) return add("fail", name, "is not set.");
    const url = parseUrl(raw);
    if (!url) return add("fail", name, "is not a valid URL.");
    if (url.protocol !== "https:")
      return add("fail", name, "must use HTTPS in production.");
    if (isLoopback(url.hostname) || PLACEHOLDER_HOST.test(url.hostname))
      return add("fail", name, "must be the real public domain.");
    if (url.pathname !== "/" || url.search || url.hash)
      add("warn", name, "should be an origin without a path or query.");
    return add("pass", name, "is a public HTTPS origin.");
  };

  // Runtime mode
  if (read(env, "NODE_ENV") === "production")
    add("pass", "NODE_ENV", "is production.");
  else add("fail", "NODE_ENV", "must be production.");
  if (read(env, "HOSTED_LOCAL") === "false")
    add("pass", "HOSTED_LOCAL", "is false.");
  else add("fail", "HOSTED_LOCAL", "must be false for a public deployment.");

  // Origins
  for (const name of ["WEB_ORIGIN", "API_ORIGIN", "NEXT_PUBLIC_APP_URL"])
    requireOrigin(name);
  const web = parseUrl(read(env, "WEB_ORIGIN") ?? "");
  const app = parseUrl(read(env, "NEXT_PUBLIC_APP_URL") ?? "");
  if (web && app && web.origin !== app.origin)
    add("fail", "WEB_ORIGIN", "must match NEXT_PUBLIC_APP_URL.");
  const apiUrl = read(env, "API_URL");
  if (!apiUrl)
    add("warn", "API_URL", "is not set; the web service requires it.");
  else if (!parseUrl(apiUrl)) add("fail", "API_URL", "is not a valid URL.");
  else if (isLoopback(parseUrl(apiUrl)!.hostname))
    add("fail", "API_URL", "must not point at loopback in production.");
  else add("pass", "API_URL", "is set.");

  // Secrets
  const authSecret = read(env, "BETTER_AUTH_SECRET");
  const fieldKey = read(env, "FIELD_ENCRYPTION_KEY");
  if (!authSecret) add("fail", "BETTER_AUTH_SECRET", "is not set.");
  else if (authSecret.length < 32)
    add("fail", "BETTER_AUTH_SECRET", "must be at least 32 characters.");
  else if (KNOWN_DEFAULT_SECRET.test(authSecret) || /^(.)\1*$/.test(authSecret))
    add("fail", "BETTER_AUTH_SECRET", "looks like a placeholder value.");
  else add("pass", "BETTER_AUTH_SECRET", "meets the length requirement.");
  if (!fieldKey) add("fail", "FIELD_ENCRYPTION_KEY", "is not set.");
  else if (!HEX_KEY.test(fieldKey))
    add("fail", "FIELD_ENCRYPTION_KEY", "must be 64 hexadecimal characters.");
  else if (/^0{64}$/.test(fieldKey))
    add("fail", "FIELD_ENCRYPTION_KEY", "must not be all zeros.");
  else if (fieldKey === authSecret)
    add("fail", "FIELD_ENCRYPTION_KEY", "must differ from BETTER_AUTH_SECRET.");
  else add("pass", "FIELD_ENCRYPTION_KEY", "is a valid 256-bit key.");
  const previous = read(env, "FIELD_ENCRYPTION_PREVIOUS_KEYS");
  if (previous && previous !== "[]") {
    let keys: unknown;
    try {
      keys = JSON.parse(previous);
    } catch {
      keys = undefined;
    }
    if (
      !Array.isArray(keys) ||
      keys.length > 10 ||
      !keys.every((key) => typeof key === "string" && HEX_KEY.test(key))
    )
      add(
        "fail",
        "FIELD_ENCRYPTION_PREVIOUS_KEYS",
        "must be a JSON array of at most ten 64-character hexadecimal keys.",
      );
    else if (keys.includes(fieldKey))
      add(
        "fail",
        "FIELD_ENCRYPTION_PREVIOUS_KEYS",
        "must not repeat the current key.",
      );
    else
      add(
        "warn",
        "FIELD_ENCRYPTION_PREVIOUS_KEYS",
        "retains old keys; remove them after rekeying completes.",
      );
  }

  // MongoDB
  const mongoUri = read(env, "MONGODB_URI");
  const mongo = mongoUri ? parseMongoUri(mongoUri) : undefined;
  if (!mongoUri) add("fail", "MONGODB_URI", "is not set.");
  else if (!mongo)
    add("fail", "MONGODB_URI", "is not a valid MongoDB connection string.");
  else {
    if (mongo.hosts.some(isLoopback))
      add("fail", "MONGODB_URI", "must not point at loopback in production.");
    if (!mongo.user || !mongo.password)
      add("fail", "MONGODB_URI", "must include authentication credentials.");
    if (!mongo.database) add("fail", "MONGODB_URI", "must name a database.");
    const srv = mongo.scheme === "mongodb+srv";
    if (!srv && mongo.hosts.length < 2 && !mongo.params.get("replicaSet"))
      add(
        "fail",
        "MONGODB_URI",
        "must target a replica set (use mongodb+srv, several hosts, or replicaSet=).",
      );
    const tls = ["tls", "ssl"].some((key) => mongo.params.get(key) === "true");
    if (!srv && !tls)
      add(
        mongo.hosts.every(isPrivateHost) ? "warn" : "fail",
        "MONGODB_URI",
        "should enable TLS (tls=true) on network-crossing connections.",
      );
    if (!findings.some((f) => f.check === "MONGODB_URI" && f.level !== "pass"))
      add("pass", "MONGODB_URI", "is authenticated and targets a replica set.");
  }

  // Redis
  const redisUrl = read(env, "REDIS_URL");
  const redis = redisUrl ? parseUrl(redisUrl) : undefined;
  if (!redisUrl) add("fail", "REDIS_URL", "is not set.");
  else if (!redis || !["redis:", "rediss:"].includes(redis.protocol))
    add("fail", "REDIS_URL", "must be a redis:// or rediss:// URL.");
  else if (isLoopback(redis.hostname))
    add("fail", "REDIS_URL", "must not point at loopback in production.");
  else {
    const privateHost = isPrivateHost(redis.hostname);
    if (!privateHost && redis.protocol !== "rediss:")
      add("fail", "REDIS_URL", "must use rediss:// (TLS) on public networks.");
    else if (redis.protocol !== "rediss:")
      add(
        "warn",
        "REDIS_URL",
        "uses plain redis://; confirm the network is private.",
      );
    if (!redis.password)
      add(
        privateHost ? "warn" : "fail",
        "REDIS_URL",
        "should include a password.",
      );
    if (!findings.some((f) => f.check === "REDIS_URL" && f.level !== "pass"))
      add("pass", "REDIS_URL", "uses TLS with authentication.");
  }

  // Email
  const smtpHost = read(env, "SMTP_HOST");
  if (!smtpHost) add("fail", "SMTP_HOST", "is not set.");
  else if (isLoopback(smtpHost) || /^mailpit$/i.test(smtpHost))
    add("fail", "SMTP_HOST", "must be a real transactional provider.");
  else add("pass", "SMTP_HOST", "is set.");
  const smtpPort = Number(read(env, "SMTP_PORT"));
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535)
    add("fail", "SMTP_PORT", "must be a valid port.");
  else if ([25, 1025].includes(smtpPort))
    add("warn", "SMTP_PORT", "is an unencrypted or local-testing port.");
  const smtpUser = read(env, "SMTP_USER");
  if (smtpUser && !read(env, "SMTP_PASSWORD"))
    add("fail", "SMTP_PASSWORD", "is required when SMTP_USER is set.");
  else if (!smtpUser && smtpHost && !isPrivateHost(smtpHost))
    add(
      "warn",
      "SMTP_USER",
      "is empty; most providers require authentication.",
    );
  const from = read(env, "EMAIL_FROM");
  const fromAddress = from?.match(/<([^>]+)>/)?.[1] ?? from;
  const fromHost = fromAddress?.split("@")[1];
  if (!from) add("fail", "EMAIL_FROM", "is not set.");
  else if (!fromHost || PLACEHOLDER_HOST.test(fromHost))
    add("fail", "EMAIL_FROM", "must use a real, verified sender domain.");
  else add("pass", "EMAIL_FROM", "uses a real sender domain.");

  // Operator identity
  const contact = read(env, "PRIVACY_CONTACT_EMAIL");
  const contactHost = contact?.split("@")[1];
  if (!contact || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact))
    add("fail", "PRIVACY_CONTACT_EMAIL", "must be a valid email address.");
  else if (!contactHost || PLACEHOLDER_HOST.test(contactHost))
    add("fail", "PRIVACY_CONTACT_EMAIL", "must be a real monitored mailbox.");
  else add("pass", "PRIVACY_CONTACT_EMAIL", "is set.");
  const officer = read(env, "GRIEVANCE_OFFICER_NAME");
  if (!officer || PLACEHOLDER_NAMES.has(officer.toLowerCase()))
    add(
      "fail",
      "GRIEVANCE_OFFICER_NAME",
      "must be the real grievance officer.",
    );
  else add("pass", "GRIEVANCE_OFFICER_NAME", "is set.");

  // Billing (all or nothing)
  const configured = BILLING_FIELDS.filter((name) => read(env, name));
  if (configured.length === 0)
    add("pass", "Billing", "is not configured (Free-only operation).");
  else if (configured.length < BILLING_FIELDS.length)
    add(
      "fail",
      "Billing",
      `is partially configured; missing ${BILLING_FIELDS.filter((name) => !read(env, name)).join(", ")}.`,
    );
  else {
    const keyId = read(env, "RAZORPAY_KEY_ID")!;
    if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId))
      add("fail", "RAZORPAY_KEY_ID", "has an unexpected format.");
    else if (keyId.startsWith("rzp_test_"))
      add(
        "warn",
        "RAZORPAY_KEY_ID",
        "is a test key; test billing is active in this deployment.",
      );
    else
      add(
        "warn",
        "RAZORPAY_KEY_ID",
        "is a live key; confirm the payment lifecycle checks in docs/LAUNCH_CHECKLIST.md are complete.",
      );
    if ((read(env, "RAZORPAY_WEBHOOK_SECRET") ?? "").length < 32)
      add("fail", "RAZORPAY_WEBHOOK_SECRET", "must be at least 32 characters.");
    if (
      read(env, "RAZORPAY_PRO_PLAN_ID") ===
      read(env, "RAZORPAY_BUSINESS_PLAN_ID")
    )
      add(
        "fail",
        "RAZORPAY_PRO_PLAN_ID",
        "must differ from the Business plan.",
      );
    if (
      !read(env, "BILLING_GSTIN")!.startsWith(read(env, "BILLING_STATE_CODE")!)
    )
      add("fail", "BILLING_GSTIN", "must match BILLING_STATE_CODE.");
  }

  // Google sign-in (both or neither)
  const googleId = Boolean(read(env, "GOOGLE_CLIENT_ID"));
  const googleSecret = Boolean(read(env, "GOOGLE_CLIENT_SECRET"));
  if (googleId !== googleSecret)
    add(
      "fail",
      "Google OAuth",
      "requires both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    );
  else
    add(
      "pass",
      "Google OAuth",
      googleId ? "is fully configured." : "is not configured.",
    );

  // Proxy trust, logging, monitoring
  const proxy = read(env, "TRUSTED_PROXY");
  if (!proxy)
    add(
      "warn",
      "TRUSTED_PROXY",
      "is empty; rate limits group all proxied callers under the proxy address.",
    );
  else if (
    proxy
      .split(",")
      .some((entry) =>
        ["true", "*", "all", "0.0.0.0/0", "::/0"].includes(
          entry.trim().toLowerCase(),
        ),
      )
  )
    add(
      "fail",
      "TRUSTED_PROXY",
      "must be an explicit address or subnet allowlist, not a wildcard.",
    );
  else add("pass", "TRUSTED_PROXY", "is an explicit allowlist.");
  const logLevel = read(env, "LOG_LEVEL") ?? "info";
  if (!["fatal", "error", "warn", "info", "debug", "trace"].includes(logLevel))
    add("fail", "LOG_LEVEL", "is not a supported level.");
  else if (["debug", "trace"].includes(logLevel))
    add("warn", "LOG_LEVEL", "is verbose; use info in production.");
  const sentry = read(env, "SENTRY_DSN");
  if (sentry && parseUrl(sentry)?.protocol !== "https:")
    add("fail", "SENTRY_DSN", "must be an HTTPS DSN URL.");
  else if (!sentry)
    add("warn", "SENTRY_DSN", "is not set; no external error monitoring.");

  return findings;
}

export function summarize(findings: Finding[]) {
  return {
    failures: findings.filter((finding) => finding.level === "fail").length,
    warnings: findings.filter((finding) => finding.level === "warn").length,
    passes: findings.filter((finding) => finding.level === "pass").length,
  };
}

export function formatReport(findings: Finding[]) {
  const symbol: Record<Level, string> = {
    pass: "PASS",
    warn: "WARN",
    fail: "FAIL",
  };
  const lines = findings.map(
    (finding) =>
      `${symbol[finding.level]}  ${finding.check} ${finding.message}`,
  );
  const { failures, warnings, passes } = summarize(findings);
  lines.push(
    "",
    `${passes} passed, ${warnings} warning(s), ${failures} failure(s).`,
  );
  return lines.join("\n");
}

function main() {
  const { values } = parseArgs({
    options: {
      "env-file": { type: "string" },
      json: { type: "boolean", default: false },
      strict: { type: "boolean", default: false },
    },
  });
  const env: Environment = values["env-file"]
    ? parseEnv(readFileSync(values["env-file"], "utf8"))
    : process.env;
  const findings = evaluateEnvironment(env);
  const { failures, warnings } = summarize(findings);
  console.info(
    values.json ? JSON.stringify(findings, null, 2) : formatReport(findings),
  );
  process.exitCode = failures > 0 || (values.strict && warnings > 0) ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
