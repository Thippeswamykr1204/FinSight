import { headers } from "next/headers";
import { Billing } from "@/components/hosted/billing";
import { serverApi, serverMe } from "@/lib/hosted/server-api";
import type { BillingSummary } from "@finsight/shared";

export default async function BillingPage() {
  const [initial, me, incoming] = await Promise.all([
    serverApi<BillingSummary>("/api/v1/billing"),
    serverMe(),
    headers(),
  ]);
  return (
    <Billing
      initial={initial}
      email={me.profile.email}
      nonce={incoming.get("x-nonce") ?? undefined}
    />
  );
}
