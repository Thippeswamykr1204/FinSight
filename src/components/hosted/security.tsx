"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "react-qr-code";
import {
  Download,
  Fingerprint,
  Laptop,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { authClient } from "@/lib/hosted/auth-client";
import { Button } from "@/components/ui/button";
import {
  Field,
  FinanceDialog,
  FormError,
  PageHeading,
} from "@/components/finance/primitives";
import { download } from "@/lib/finance/import-export";

type Device = {
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string | Date;
  expiresAt: string | Date;
};
type Passkey = {
  id: string;
  name?: string | null;
  createdAt?: string | Date | null;
};

export function SecuritySettings() {
  const [sessions, setSessions] = useState<Device[]>([]);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [current, setCurrent] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [uri, setUri] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [enroll, setEnroll] = useState(false);
  const [removePasskey, setRemovePasskey] = useState<Passkey | null>(null);
  const load = useCallback(async () => {
    const [sessionResult, deviceResult, passkeyResult] = await Promise.all([
      authClient.getSession(),
      authClient.listSessions(),
      authClient.passkey.listUserPasskeys(),
    ]);
    if (sessionResult.error || deviceResult.error || passkeyResult.error)
      throw new Error(
        "Unable to load account security. Sign in again and retry.",
      );
    setEnabled(Boolean(sessionResult.data?.user.twoFactorEnabled));
    setCurrent(sessionResult.data?.session.token ?? "");
    setSessions(deviceResult.data ?? []);
    setPasskeys(passkeyResult.data ?? []);
  }, []);
  useEffect(() => {
    void load().catch((caught) => setError(String(caught)));
  }, [load]);
  async function perform(operation: () => Promise<void>) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await operation();
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Security action failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function startTotp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await perform(async () => {
      const result = await authClient.twoFactor.enable({
        password: password || undefined,
        method: "totp",
      });
      if (result.error) throw new Error(result.error.message);
      if (result.data && "totpURI" in result.data) {
        setUri(result.data.totpURI);
        setCodes(result.data.backupCodes);
      }
    });
  }
  async function verifyTotp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await perform(async () => {
      const result = await authClient.twoFactor.verifyTotp({ code });
      if (result.error) throw new Error(result.error.message);
      setUri("");
      setCode("");
      setPassword("");
      setMessage(
        "Authenticator enabled. Store your recovery codes somewhere safe.",
      );
    });
  }
  async function disableTotp() {
    await perform(async () => {
      const result = await authClient.twoFactor.disable({
        password: password || undefined,
      });
      if (result.error) throw new Error(result.error.message);
      setPassword("");
      setCodes([]);
      setEnroll(false);
      setMessage("Authenticator disabled.");
    });
  }
  async function addPasskey() {
    await perform(async () => {
      const result = await authClient.passkey.addPasskey({
        name: "My FinSight passkey",
      });
      if (result.error) throw new Error(result.error.message);
      setMessage("Passkey registered. You can use it on your next sign-in.");
    });
  }
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeading
        eyebrow="Access you control"
        title="Account security."
        description="Protect your account and review the devices with access."
      />
      <FormError error={error} />
      {message && (
        <p
          role="status"
          className="rounded-xl border bg-[var(--mint)]/40 p-4 text-sm"
        >
          {message}
        </p>
      )}
      <section className="surface p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck size={21} className="text-[var(--mint-deep)]" />
              Authenticator app
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--ink-soft)]">
              Add a time-based code to password sign-in. When enabled, email
              links and OAuth cannot bypass your authenticator; a user-verified
              passkey remains an alternative.
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${enabled ? "bg-[var(--mint)] text-[var(--mint-deep)]" : "text-[var(--ink-soft)]"}`}
          >
            {enabled ? "Enabled" : "Not enabled"}
          </span>
        </div>
        {!enroll && !enabled && (
          <Button className="mt-6" onClick={() => setEnroll(true)}>
            Set up authenticator
          </Button>
        )}
        {(enroll || enabled) && !uri && !codes.length && (
          <form onSubmit={startTotp} className="mt-6 max-w-sm space-y-4">
            <Field label="Current password">
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="control px-3"
              />
              <span className="text-xs font-normal text-[var(--ink-soft)]">
                Required to manage your authenticator. If you signed up without
                a password, set one through password reset first.
              </span>
            </Field>
            {enabled ? (
              <Button
                type="button"
                variant="outline"
                loading={busy}
                onClick={() => void disableTotp()}
              >
                Disable authenticator
              </Button>
            ) : (
              <Button loading={busy}>Generate setup code</Button>
            )}
          </form>
        )}
        {uri && (
          <div className="mt-7 grid gap-6 sm:grid-cols-[180px,1fr]">
            <div className="h-fit rounded-xl border bg-white p-4">
              <QRCode
                value={uri}
                size={148}
                title="Scan this code with your authenticator app"
              />
            </div>
            <form onSubmit={verifyTotp} className="space-y-4">
              <p className="text-sm leading-6 text-[var(--ink-soft)]">
                Scan the code with your authenticator, then enter its six-digit
                code. FinSight activates protection only after verification.
              </p>
              <details className="text-xs">
                <summary className="cursor-pointer text-[var(--mint-deep)]">
                  Use a manual setup key
                </summary>
                <input
                  aria-label="Authenticator setup key"
                  readOnly
                  value={new URL(uri).searchParams.get("secret") ?? ""}
                  className="control mt-3 w-full px-3 font-mono"
                />
              </details>
              <Field label="Authenticator code">
                <input
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  className="control px-3"
                />
              </Field>
              <Button loading={busy}>Verify authenticator</Button>
            </form>
          </div>
        )}
        {!!codes.length && (
          <div className="mt-6 rounded-xl border bg-[var(--surface-muted)] p-5">
            <h4 className="text-sm font-semibold">
              Your single-use recovery codes
            </h4>
            <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
              Save these now. Each code can replace an authenticator code once.
              Do not share them.
            </p>
            <div className="my-4 grid grid-cols-2 gap-2 font-mono text-xs">
              {codes.map((value) => (
                <code key={value}>{value}</code>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  download(
                    codes.join("\n"),
                    "finsight-recovery-codes.txt",
                    "text/plain",
                  )
                }
              >
                <Download size={14} className="mr-2" /> Download codes
              </Button>
              {enabled && (
                <Button
                  size="sm"
                  onClick={() => {
                    setCodes([]);
                    setEnroll(false);
                  }}
                >
                  I saved my codes
                </Button>
              )}
            </div>
          </div>
        )}
      </section>
      <section className="surface p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Fingerprint size={22} className="text-[var(--cobalt)]" />
              Passkeys
            </h3>
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              Use your device’s biometric or screen lock to sign in.
            </p>
          </div>
          <Button
            variant="outline"
            loading={busy}
            onClick={() => void addPasskey()}
          >
            <Plus size={15} className="mr-2" /> Add passkey
          </Button>
        </div>
        <div className="mt-6 divide-y">
          {passkeys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between gap-3 py-4"
            >
              <div>
                <p className="text-sm font-semibold">{key.name || "Passkey"}</p>
                <p className="mt-1 text-xs text-[var(--ink-soft)]">
                  {key.createdAt
                    ? `Registered ${new Date(key.createdAt).toLocaleDateString()}`
                    : "Registered authenticator"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${key.name || "passkey"}`}
                disabled={busy}
                onClick={() => setRemovePasskey(key)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
          {!passkeys.length && (
            <p className="py-4 text-sm text-[var(--ink-soft)]">
              No passkeys registered yet.
            </p>
          )}
        </div>
      </section>
      <section className="surface p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Laptop size={22} className="text-[var(--mint-deep)]" />
            Sessions and devices
          </h3>
          <Button
            variant="outline"
            loading={busy}
            onClick={() =>
              void perform(async () => {
                const result = await authClient.revokeOtherSessions();
                if (result.error) throw new Error(result.error.message);
                setMessage("Other sessions revoked.");
              })
            }
          >
            Sign out other devices
          </Button>
        </div>
        <div className="mt-6 divide-y">
          {sessions.map((session) => (
            <div
              key={session.token}
              className="flex flex-wrap items-center justify-between gap-4 py-5"
            >
              <div className="min-w-0">
                <p className="max-w-lg truncate text-sm font-medium">
                  {session.userAgent || "Unknown browser"}
                </p>
                <p className="mt-2 text-xs text-[var(--ink-soft)]">
                  Started {new Date(session.createdAt).toLocaleString()} ·
                  Expires {new Date(session.expiresAt).toLocaleDateString()}
                </p>
              </div>
              {session.token === current ? (
                <span className="rounded-full bg-[var(--mint)] px-3 py-1 text-xs text-[var(--mint-deep)]">
                  This device
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void perform(async () => {
                      const result = await authClient.revokeSession({
                        token: session.token,
                      });
                      if (result.error) throw new Error(result.error.message);
                      setMessage("Session revoked.");
                    })
                  }
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>
      <FinanceDialog
        open={!!removePasskey}
        onClose={() => setRemovePasskey(null)}
        title="Remove this passkey?"
        description="This passkey will no longer be able to sign in. Keep your password or another passkey available."
      >
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setRemovePasskey(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={busy}
            onClick={() =>
              void perform(async () => {
                const result = await authClient.passkey.deletePasskey({
                  id: removePasskey!.id,
                });
                if (result.error) throw new Error(result.error.message);
                setRemovePasskey(null);
                setMessage("Passkey removed.");
              })
            }
          >
            Remove passkey
          </Button>
        </div>
      </FinanceDialog>
    </div>
  );
}
