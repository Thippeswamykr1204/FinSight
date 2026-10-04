-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "v2_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "v2_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_sessions" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "v2_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_auth_accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_auth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_two_factors" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "failedVerificationCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "v2_two_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_passkeys" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "publicKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialID" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aaguid" TEXT,

    CONSTRAINT "v2_passkeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v2_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_workspace_members" (
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v2_workspace_members_pkey" PRIMARY KEY ("workspaceId","userId")
);

-- CreateTable
CREATE TABLE "v2_workspace_invitations" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'VIEWER',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v2_workspace_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_financial_accounts" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "openingBalance" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v2_financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_ledger_entries" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "merchant" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "date" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "importKey" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_budget_plans" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "month" CHAR(7) NOT NULL,
    "limit" BIGINT NOT NULL,

    CONSTRAINT "v2_budget_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_savings_goals" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target" BIGINT NOT NULL,
    "saved" BIGINT NOT NULL DEFAULT 0,
    "due" DATE NOT NULL,

    CONSTRAINT "v2_savings_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_idempotent_writes" (
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v2_idempotent_writes_pkey" PRIMARY KEY ("workspaceId","key")
);

-- CreateTable
CREATE TABLE "v2_audit_events" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceId" TEXT,
    "requestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v2_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_rate_buckets" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_rate_buckets_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "v2_email_outbox" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v2_email_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "v2_users_email_key" ON "v2_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "v2_sessions_token_key" ON "v2_sessions"("token");

-- CreateIndex
CREATE INDEX "v2_sessions_userId_idx" ON "v2_sessions"("userId");

-- CreateIndex
CREATE INDEX "v2_auth_accounts_userId_idx" ON "v2_auth_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "v2_auth_accounts_providerId_accountId_key" ON "v2_auth_accounts"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "v2_verifications_identifier_idx" ON "v2_verifications"("identifier");

-- CreateIndex
CREATE INDEX "v2_two_factors_userId_idx" ON "v2_two_factors"("userId");
CREATE INDEX "v2_two_factors_secret_idx" ON "v2_two_factors"("secret");

-- CreateIndex
CREATE UNIQUE INDEX "v2_passkeys_credentialID_key" ON "v2_passkeys"("credentialID");

-- CreateIndex
CREATE INDEX "v2_passkeys_userId_idx" ON "v2_passkeys"("userId");

-- CreateIndex
CREATE INDEX "v2_workspace_members_userId_createdAt_idx" ON "v2_workspace_members"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "v2_workspace_invitations_tokenHash_key" ON "v2_workspace_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "v2_workspace_invitations_workspaceId_email_idx" ON "v2_workspace_invitations"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "v2_financial_accounts_workspaceId_createdAt_id_idx" ON "v2_financial_accounts"("workspaceId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "v2_financial_accounts_workspaceId_id_key" ON "v2_financial_accounts"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "v2_ledger_entries_workspaceId_date_id_idx" ON "v2_ledger_entries"("workspaceId", "date" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "v2_ledger_entries_workspaceId_category_date_idx" ON "v2_ledger_entries"("workspaceId", "category", "date");

-- CreateIndex
CREATE UNIQUE INDEX "v2_ledger_entries_workspaceId_id_key" ON "v2_ledger_entries"("workspaceId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "v2_ledger_entries_workspaceId_importKey_key" ON "v2_ledger_entries"("workspaceId", "importKey");

-- CreateIndex
CREATE INDEX "v2_budget_plans_workspaceId_month_idx" ON "v2_budget_plans"("workspaceId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "v2_budget_plans_workspaceId_category_month_key" ON "v2_budget_plans"("workspaceId", "category", "month");

-- CreateIndex
CREATE INDEX "v2_savings_goals_workspaceId_due_idx" ON "v2_savings_goals"("workspaceId", "due");

-- CreateIndex
CREATE INDEX "v2_idempotent_writes_createdAt_idx" ON "v2_idempotent_writes"("createdAt");

-- CreateIndex
CREATE INDEX "v2_audit_events_workspaceId_createdAt_id_idx" ON "v2_audit_events"("workspaceId", "createdAt" DESC, "id");

-- CreateIndex
CREATE INDEX "v2_rate_buckets_expiresAt_idx" ON "v2_rate_buckets"("expiresAt");

-- CreateIndex
CREATE INDEX "v2_email_outbox_sentAt_availableAt_idx" ON "v2_email_outbox"("sentAt", "availableAt");

-- AddForeignKey
ALTER TABLE "v2_sessions" ADD CONSTRAINT "v2_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "v2_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_auth_accounts" ADD CONSTRAINT "v2_auth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "v2_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_two_factors" ADD CONSTRAINT "v2_two_factors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "v2_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_passkeys" ADD CONSTRAINT "v2_passkeys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "v2_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_workspace_members" ADD CONSTRAINT "v2_workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "v2_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_workspace_members" ADD CONSTRAINT "v2_workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "v2_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_workspace_invitations" ADD CONSTRAINT "v2_workspace_invitations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "v2_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_financial_accounts" ADD CONSTRAINT "v2_financial_accounts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "v2_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_ledger_entries" ADD CONSTRAINT "v2_ledger_entries_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "v2_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_ledger_entries" ADD CONSTRAINT "v2_ledger_entries_workspaceId_accountId_fkey" FOREIGN KEY ("workspaceId", "accountId") REFERENCES "v2_financial_accounts"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_budget_plans" ADD CONSTRAINT "v2_budget_plans_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "v2_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_savings_goals" ADD CONSTRAINT "v2_savings_goals_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "v2_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_idempotent_writes" ADD CONSTRAINT "v2_idempotent_writes_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "v2_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_audit_events" ADD CONSTRAINT "v2_audit_events_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "v2_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Defense in depth: all money is in integer minor units and scoped account links
-- are enforced by the composite foreign key above, not only application checks.
ALTER TABLE "v2_financial_accounts" ADD CONSTRAINT "account_money_range" CHECK (abs("openingBalance") <= 100000000000);
ALTER TABLE "v2_financial_accounts" ADD CONSTRAINT "account_type" CHECK ("type" IN ('Cash', 'Credit', 'Investments'));
ALTER TABLE "v2_ledger_entries" ADD CONSTRAINT "entry_money_range" CHECK ("amount" > 0 AND "amount" <= 100000000000);
ALTER TABLE "v2_ledger_entries" ADD CONSTRAINT "entry_type" CHECK ("type" IN ('income', 'expense'));
ALTER TABLE "v2_budget_plans" ADD CONSTRAINT "budget_money_range" CHECK ("limit" > 0 AND "limit" <= 100000000000);
ALTER TABLE "v2_savings_goals" ADD CONSTRAINT "goal_money_range" CHECK ("target" > 0 AND "target" <= 100000000000 AND "saved" >= 0 AND "saved" <= "target");
ALTER TABLE "v2_workspaces" ADD CONSTRAINT "workspace_currency" CHECK ("currency" = 'USD');
ALTER TABLE "v2_workspace_invitations" ADD CONSTRAINT "invite_non_owner" CHECK ("role" <> 'OWNER');
