import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { betterAuth, APIError } from "better-auth";
import { twoFactor, magicLink } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import type { MongoClient } from "mongodb";
import { hash, verify, argon2id } from "argon2";
import { verifyPassword } from "better-auth/crypto";
import { getDb } from "./mongo";
import { loadConfig } from "./config";
import { queueEmail } from "./email";
import { consumeLimit } from "./redis";

const privacyNoticeVersion = "2026-10-05";
let instance: ReturnType<typeof createAuth> | undefined;

function createAuth() {
  const config = loadConfig();
  const client = mongoose.connection.getClient() as unknown as MongoClient;
  const database = getDb();
  return betterAuth({
    appName: "FinSight",
    baseURL: config.WEB_ORIGIN,
    basePath: "/api/identity",
    secret: config.BETTER_AUTH_SECRET,
    trustedOrigins: [config.WEB_ORIGIN, config.API_ORIGIN],
    database: mongodbAdapter(database, {
      client,
      transaction: true,
      usePlural: true,
    }),
    advanced: {
      database: { generateId: () => randomUUID() },
      cookiePrefix: "finsight-v3",
      ipAddress: { ipAddressHeaders: ["x-finsight-client-ip"] },
      useSecureCookies: new URL(config.WEB_ORIGIN).protocol === "https:",
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: new URL(config.WEB_ORIGIN).protocol === "https:",
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60,
      freshAge: 60 * 10,
      cookieCache: { enabled: false },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
      password: {
        hash: (password) =>
          hash(password, {
            type: argon2id,
            memoryCost: 65536,
            timeCost: 3,
            parallelism: 1,
          }),
        verify: ({ hash: encoded, password }) =>
          encoded.startsWith("$argon2id$")
            ? verify(encoded, password)
            : verifyPassword({ hash: encoded, password }),
      },
      sendResetPassword: async ({ user, url }) => {
        await queueEmail(
          user.email,
          "Reset your FinSight password",
          `Use this single-use link to choose a new password:\n${url}\n\nIf you did not request this, ignore this email.`,
        );
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: 1800,
      sendVerificationEmail: async ({ user, url }) => {
        await queueEmail(
          user.email,
          "Verify your FinSight email",
          `Confirm your email address to open your workspace:\n${url}\n\nThis link expires in 30 minutes.`,
        );
      },
    },
    account: { encryptOAuthTokens: true, accountLinking: { enabled: false } },
    socialProviders: {
      ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              requireEmailVerification: true,
            },
          }
        : {}),
      ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
        ? {
            apple: {
              clientId: process.env.APPLE_CLIENT_ID,
              clientSecret: process.env.APPLE_CLIENT_SECRET,
              requireEmailVerification: true,
            },
          }
        : {}),
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customStorage: { consume: consumeLimit },
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 60, max: 5 },
      },
    },
    user: {
      additionalFields: {
        noticeAccepted: {
          type: "boolean",
          required: true,
          defaultValue: false,
        },
        noticeVersion: {
          type: "string",
          input: false,
          defaultValue: privacyNoticeVersion,
        },
        noticeAcceptedAt: { type: "date", input: false, required: false },
      },
    },
    verification: { storeIdentifier: "hashed" },
    plugins: [
      twoFactor({ issuer: "FinSight" }),
      magicLink({
        storeToken: "hashed",
        expiresIn: 600,
        disableSignUp: true,
        sendMagicLink: async ({ email, url }) => {
          await queueEmail(
            email,
            "Your FinSight sign-in link",
            `Sign in securely:\n${url}\n\nThis link can be used once and expires in 10 minutes. If you enabled an authenticator, use password or passkey sign-in instead.`,
          );
        },
      }),
      passkey({
        rpID: new URL(config.WEB_ORIGIN).hostname,
        rpName: "FinSight",
        origin: config.WEB_ORIGIN,
        authenticatorSelection: { userVerification: "required" },
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (!("noticeAccepted" in user) || user.noticeAccepted !== true) {
              throw new APIError("BAD_REQUEST", {
                message:
                  "Read and accept the privacy notice and terms before creating an account.",
              });
            }
            return {
              data: {
                ...user,
                noticeVersion: privacyNoticeVersion,
                noticeAcceptedAt: new Date(),
              },
            };
          },
        },
      },
      session: {
        create: {
          before: async (session, context) => {
            const user = await database
              .collection("users")
              .findOne(
                { _id: session.userId as never },
                { projection: { twoFactorEnabled: 1 } },
              );
            const allowed = [
              "/sign-in/email",
              "/two-factor/verify-totp",
              "/two-factor/verify-backup-code",
              "/passkey/verify-authentication",
              "/two-factor/enable",
              "/two-factor/disable",
              "/change-password",
            ];
            if (
              user?.twoFactorEnabled &&
              !allowed.includes(context?.path ?? "")
            )
              throw new APIError("FORBIDDEN", {
                message:
                  "Use your password and authenticator, or a registered passkey, to sign in.",
              });
            return { data: session };
          },
        },
      },
    },
  });
}

export function getAuth() {
  return (instance ??= createAuth());
}

export type Auth = ReturnType<typeof getAuth>;
