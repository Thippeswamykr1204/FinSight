"use client";
import { createAuthClient } from "better-auth/react";
import { magicLinkClient, twoFactorClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";

export const authClient = createAuthClient({
  basePath: "/api/identity",
  plugins: [magicLinkClient(), twoFactorClient(), passkeyClient()],
});
