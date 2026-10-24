# Encryption key rotation

`FIELD_ENCRYPTION_KEY` is a 32-byte AES-256-GCM key represented as 64 hexadecimal characters. The current release reads one active key. Because encrypted fields include a random IV and authentication tag, rotation is an explicit data migration rather than a string replacement.

## Procedure

1. Generate a new key with `openssl rand -hex 32` and store it in the secret manager under a new version.
2. Put the old key in a short-lived, access-controlled migration environment. Do not commit either key.
3. Add a migration command that reads each encrypted field, decrypts with the old key, and re-encrypts with the new key. Run it against a backup or staging clone first.
4. Stop writes or use a maintenance window while the migration is running. Record the migration request ID and affected collection counts in the operator log, never the field contents.
5. Deploy the new key, verify login, invitation lookup, exports, and deletion, then remove the old key from runtime access.
6. Retain the old key only as long as the backup-retention and incident-response policy requires. Destroy it according to that policy.

The current application keeps the encryption helper intentionally small so a future migration can wrap it with an active-key ID and a retained-key ring without changing stored domain objects.
