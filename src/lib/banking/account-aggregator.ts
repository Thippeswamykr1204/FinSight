/** Integration boundary only. No provider is registered or live. */
export type ConsentStatus = "pending" | "active" | "revoked" | "expired";
export interface AggregatorConsent {
  id: string;
  workspaceId: string;
  provider: string;
  status: ConsentStatus;
  purpose: string;
  from: string;
  to: string;
  expiresAt: string;
}
export interface AggregatedEntry {
  externalId: string;
  accountReference: string;
  currency: "INR";
  amountPaise: number;
  date: string;
  narration: string;
  direction: "debit" | "credit";
}
export interface AccountAggregatorAdapter {
  readonly provider: string;
  readonly live: boolean;
  requestConsent(input: {
    workspaceId: string;
    userId: string;
    purpose: string;
    from: string;
    to: string;
    expiresAt: string;
    callbackUrl: string;
  }): Promise<{ consent: AggregatorConsent; redirectUrl: string }>;
  getConsent(consentId: string): Promise<AggregatorConsent>;
  revokeConsent(consentId: string): Promise<void>;
  fetchEntries(
    consentId: string,
    cursor?: string,
  ): Promise<{ entries: AggregatedEntry[]; nextCursor: string | null }>;
  verifyWebhook(
    rawBody: Uint8Array,
    headers: Headers,
  ): Promise<{ eventId: string; consentId: string; status: ConsentStatus }>;
}
