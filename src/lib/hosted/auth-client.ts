"use client";
import { createAuthClient } from "better-auth/react";
import {
  magicLinkClient,
  twoFactorClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";
import type { HostedAuth } from "./auth";
import { passkeyClient } from "@better-auth/passkey/client";

export const authClient = createAuthClient({
  basePath: "/api/identity",
  plugins: [
    magicLinkClient(),
    twoFactorClient(),
    passkeyClient(),
    inferAdditionalFields<HostedAuth>(),
  ],
});
