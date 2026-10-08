# Field encryption key rotation

`FIELD_ENCRYPTION_KEY` must contain 32 cryptographically random bytes encoded as
64 hex characters. Neither the API nor worker has a fallback key or auth secret.
Generate local credentials with `npm run env:init`; the resulting `.env` is
exclusive-created with mode `0600`. Store production secrets in your deployment
provider's secret manager, separately from database backups.

New fields use AES-256-GCM envelopes `v2.<key-id>.<nonce>.<tag>.<ciphertext>`.
The key id is the first 16 hex characters of SHA-256 of the decoded key. The
version, key id, and field purpose are authenticated. Retained keys are only used
for decryption; writes always use the active key. Authenticated v1 envelopes are
also readable during migration.

## Procedure

1. Back up MongoDB and record the current key in the secret manager. Retain any
   older keys needed to restore retained backups. Do not put keys in logs or Git.
2. Generate a new key with `openssl rand -hex 32`.
3. Set `FIELD_ENCRYPTION_PREVIOUS_KEYS` to a JSON array of the old key values,
   and `FIELD_ENCRYPTION_KEY` to the new value on **both API and worker**. Deploy
   both together; drain API requests and pause workers during the change so old
   instances never encounter fields encrypted by the new key.
4. Run `npm run fields:rekey` from a controlled release job with the new active key
   and retained old keys. This streams every encrypted field and uses compare-and-set
   writes; the plaintext snapshot is unchanged. It is resumable and reports only
   collection counts. Rerun if conflicts are reported. The inventory is:
   `email_outbox.body` (purpose `email`), `billingaccounts.profile`
   (`billing-profile:{userId}`), `billingsubscriptions.parties`
   (`billing-subscription:{subscriptionId}`), and `billinginvoices.parties`
   (`billing-invoice:{paymentId}`). Empty delivered bodies and null profiles are skipped.
5. Resume services and verify email, billing profile/invoice decryption and `/ready`.
   A second rekey run must report zero changed/conflicted records. Remove old keys
   from runtime only after all old envelopes have been rekeyed. Billing snapshots
   can remain eight years; mail expiry alone is not sufficient to retire their keys.
   Keep old keys in restricted backup escrow for the full backup retention period.
   Restoring an older backup requires its keys. The runtime ring supports at most
   ten retained keys; rekey before that bound is reached.

To roll back, pause workers, restore the former active key, and retain the new key
in `FIELD_ENCRYPTION_PREVIOUS_KEYS` so records written during rotation remain
readable. Never replace a lost key with zeros: encrypted values cannot be recovered
without their original key.
