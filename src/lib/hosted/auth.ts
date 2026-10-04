import { betterAuth, APIError } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor, magicLink } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { hostedConfig } from "./config";
import { hostedDb } from "./db";
import { queueEmail } from "./email";
import { consumeLimit } from "./rate-limit";

function createAuth() {
  const config = hostedConfig();
  return betterAuth({
    appName: "FinSight",
    baseURL: config.origin,
    basePath: "/api/identity",
    secret: config.secret,
    trustedOrigins: [config.origin],
    database: prismaAdapter(hostedDb(), { provider: "postgresql" }),
    advanced: {
      cookiePrefix: "finsight-v2",
      useSecureCookies: new URL(config.origin).protocol === "https:",
      ipAddress: { ipAddressHeaders: ["x-finsight-client-ip"] },
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
      sendResetPassword: async ({ user, url }) =>
        queueEmail(
          user.email,
          "Reset your FinSight password",
          `Use this single-use link to choose a new password:\n${url}\n\nIf you did not request this, ignore this email.`,
        ),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: 1800,
      sendVerificationEmail: async ({ user, url }) =>
        queueEmail(
          user.email,
          "Verify your FinSight email",
          `Confirm your email address to open your workspace:\n${url}\n\nThis link expires in 30 minutes.`,
        ),
    },
    account: { encryptOAuthTokens: true, accountLinking: { enabled: false } },
    verification: { storeIdentifier: "hashed" },
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
    databaseHooks: {
      session: {
        create: {
          before: async (session, context) => {
            const user = await hostedDb().user.findUnique({
              where: { id: session.userId },
              select: { twoFactorEnabled: true },
            });
            // Password sign-in is challenged by the TOTP plugin before a session escapes.
            // Other methods may not silently bypass a user's configured second factor.
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
    plugins: [
      twoFactor({ issuer: "FinSight" }),
      magicLink({
        storeToken: "hashed",
        expiresIn: 600,
        disableSignUp: true,
        sendMagicLink: async ({ email, url }) =>
          queueEmail(
            email,
            "Your FinSight sign-in link",
            `Sign in securely:\n${url}\n\nThis link can be used once and expires in 10 minutes. If you enabled an authenticator, use password or passkey sign-in instead.`,
          ),
      }),
      passkey({
        rpID: new URL(config.origin).hostname,
        rpName: "FinSight",
        origin: config.origin,
        authenticatorSelection: { userVerification: "required" },
      }),
    ],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;
export function hostedAuth() {
  return (instance ??= createAuth());
}
export type HostedAuth = ReturnType<typeof hostedAuth>;
