-- Do not reinterpret any existing financial amounts or infer an exchange rate.
-- Only financially empty legacy workspaces adopt INR. Funded USD ledgers remain
-- explicitly denominated in USD and read-only in this India-first release.
DO $$
BEGIN
  ALTER TABLE "v2_workspaces" DROP CONSTRAINT "workspace_currency";
  ALTER TABLE "v2_workspaces" ALTER COLUMN "currency" SET DEFAULT 'INR';
  UPDATE "v2_workspaces" w SET "currency" = 'INR'
  WHERE w."currency" = 'USD'
    AND NOT EXISTS (SELECT 1 FROM "v2_financial_accounts" a WHERE a."workspaceId" = w.id)
    AND NOT EXISTS (SELECT 1 FROM "v2_ledger_entries" e WHERE e."workspaceId" = w.id)
    AND NOT EXISTS (SELECT 1 FROM "v2_budget_plans" b WHERE b."workspaceId" = w.id)
    AND NOT EXISTS (SELECT 1 FROM "v2_savings_goals" g WHERE g."workspaceId" = w.id);
  ALTER TABLE "v2_workspaces" ADD CONSTRAINT "workspace_currency" CHECK ("currency" IN ('INR', 'USD'));
END $$;
