import { randomBytes } from "node:crypto";

process.env.NODE_ENV = "test";
process.env.BETTER_AUTH_SECRET = randomBytes(48).toString("base64url");
process.env.FIELD_ENCRYPTION_KEY = randomBytes(32).toString("hex");
