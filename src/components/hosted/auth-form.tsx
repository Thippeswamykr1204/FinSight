"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Fingerprint,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { authClient } from "@/lib/hosted/auth-client";
import { BrandMark } from "@/components/layout/app-shell";
import { Field, FormError } from "@/components/finance/primitives";
import { Button } from "@/components/ui/button";

type Mode = "sign-in" | "sign-up" | "reset" | "new-password" | "mfa";
type Capabilities = {
  enabled: boolean;
  google: boolean;
  apple: boolean;
  local: boolean;
};
export function AuthForm({
  mode,
  capabilities,
  token,
  initialError,
}: {
  mode: Mode;
  capabilities: Capabilities;
  token?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState(
    initialError
      ? "This link could not be verified. Request a new link or sign in again."
      : "",
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [magic, setMagic] = useState(false);
  const [backup, setBackup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (mode === "sign-up") {
        const result = await authClient.signUp.email({
          name,
          email,
          password,
          noticeAccepted: true,
          callbackURL: "/sign-in?verified=1",
        });
        if (result.error) throw new Error(result.error.message);
        setMessage(
          "Check your inbox for a verification link. Verify your address, then sign in to create your workspace.",
        );
      } else if (mode === "reset") {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: "/auth/new-password",
        });
        if (result.error) throw new Error(result.error.message);
        setMessage(
          "If this address belongs to an account, a password reset email has been queued.",
        );
      } else if (mode === "new-password") {
        if (!token)
          throw new Error(
            "This reset link is missing its token. Request a new reset email.",
          );
        const result = await authClient.resetPassword({
          token,
          newPassword: password,
        });
        if (result.error) throw new Error(result.error.message);
        setMessage(
          "Password changed. All previous sessions have been revoked. You can sign in now.",
        );
      } else if (mode === "mfa") {
        const result = backup
          ? await authClient.twoFactor.verifyBackupCode({ code })
          : await authClient.twoFactor.verifyTotp({ code });
        if (result.error) throw new Error(result.error.message);
        window.location.assign("/app");
      } else if (magic) {
        const result = await authClient.signIn.magicLink({
          email,
          callbackURL: "/app",
          errorCallbackURL: "/sign-in",
        });
        if (result.error) throw new Error(result.error.message);
        setMessage(
          "If this address belongs to an account, a single-use sign-in link has been queued. Authenticator-enabled accounts must use password or passkey sign-in.",
        );
      } else {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) throw new Error(result.error.message);
        if (
          result.data &&
          "twoFactorRedirect" in result.data &&
          result.data.twoFactorRedirect
        )
          router.push("/auth/mfa");
        else window.location.assign("/app");
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not complete sign-in. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function passkey() {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.passkey();
      if (result.error) throw new Error(result.error.message);
      window.location.assign("/app");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Passkey sign-in was cancelled or unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function social(provider: "google" | "apple") {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: "/app",
        errorCallbackURL: "/sign-in",
      });
      if (result.error) throw new Error(result.error.message);
    } catch (caught) {
      setError(String(caught));
      setBusy(false);
    }
  }
  const titles: Record<Mode, string> = {
    "sign-in": "A clearer view awaits.",
    "sign-up": "Make room for your future.",
    reset: "Find your way back.",
    "new-password": "Choose a fresh start.",
    mfa: "One more layer of trust.",
  };
  return (
    <main className="grid min-h-screen lg:grid-cols-[.9fr,1.1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#101b16] p-14 text-white lg:flex">
        <Link href="/">
          <BrandMark />
        </Link>
        <div>
          <p className="eyebrow text-[#b8f2d0]">
            Your financial operating system
          </p>
          <h1 className="mt-7 max-w-lg text-6xl font-semibold leading-[1.02] tracking-[-.06em]">
            A little more clarity.
            <br />
            <span className="font-display font-normal italic text-[#b8f2d0]">
              A lot more possibility.
            </span>
          </h1>
          <p className="mt-8 max-w-md text-base leading-8 text-white/70">
            Your real workspace starts with you. Keep your accounts, plans, and
            progress together, with access you control.
          </p>
        </div>
        <p className="flex items-center gap-2 text-xs text-white/65">
          <ShieldCheck size={17} /> Verified identity · Private workspaces ·
          Secure sessions
        </p>
      </section>
      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[430px]">
          <Link href="/" className="mb-10 inline-block lg:hidden">
            <BrandMark />
          </Link>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--mint)] text-[var(--mint-deep)]">
            <LockKeyhole size={22} />
          </span>
          <h2 className="mt-7 text-3xl font-semibold tracking-[-.055em]">
            {titles[mode]}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
            {mode === "sign-up"
              ? "Create a verified account. Your hosted workspace starts empty; demo records stay separate."
              : mode === "mfa"
                ? "Enter a code from your authenticator, or use one of your saved recovery codes."
                : "Sign in to your hosted FinSight workspace."}
          </p>
          {!capabilities.enabled ? (
            <div className="mt-7 rounded-2xl border bg-[var(--surface)] p-5">
              <h3 className="font-semibold">
                Hosted mode is not enabled here.
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                For local development, run <code>npm run dev:hosted</code> to
                start the isolated database and email inbox. You can explore the
                demo right away.
              </p>
              <Link
                href="/dashboard"
                className="mt-5 inline-block text-sm font-semibold text-[var(--mint-deep)]"
              >
                Open the demo →
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={submit} className="mt-7 space-y-4">
                {mode === "sign-up" && (
                  <Field label="Your name">
                    <input
                      autoComplete="name"
                      required
                      maxLength={60}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="control px-3"
                    />
                  </Field>
                )}
                {!["new-password", "mfa"].includes(mode) && (
                  <Field label="Email address">
                    <input
                      required
                      type="email"
                      autoComplete="username webauthn"
                      maxLength={254}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="control px-3"
                    />
                  </Field>
                )}
                {(mode === "sign-up" ||
                  mode === "new-password" ||
                  (mode === "sign-in" && !magic)) && (
                  <Field
                    label={
                      mode === "new-password" ? "New password" : "Password"
                    }
                  >
                    <input
                      required
                      type="password"
                      autoComplete={
                        mode === "sign-in" ? "current-password" : "new-password"
                      }
                      minLength={mode === "sign-in" ? 1 : 12}
                      maxLength={128}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="control px-3"
                    />
                    {mode !== "sign-in" && (
                      <span className="text-[11px] font-normal text-[var(--ink-soft)]">
                        Use at least 12 characters. A long, unique passphrase
                        works well.
                      </span>
                    )}
                  </Field>
                )}
                {mode === "mfa" && (
                  <Field
                    label={backup ? "Recovery code" : "Authenticator code"}
                  >
                    <input
                      required
                      autoComplete="one-time-code"
                      inputMode={backup ? "text" : "numeric"}
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      className="control px-3 text-center tracking-widest"
                    />
                  </Field>
                )}
                {mode === "sign-up" && (
                  <label className="flex items-start gap-3 text-xs leading-6">
                    <input
                      type="checkbox"
                      required
                      className="mt-1 h-4 w-4 shrink-0"
                      aria-label="Accept privacy notice and terms"
                    />
                    <span>
                      I am 18 or older and agree to the{" "}
                      <Link href="/terms" className="underline">
                        terms
                      </Link>{" "}
                      and the processing described in the{" "}
                      <Link href="/privacy" className="underline">
                        privacy notice
                      </Link>
                      . No marketing or bank-sync consent is included.
                    </span>
                  </label>
                )}
                <FormError error={error} />
                {message && (
                  <p
                    role="status"
                    className="rounded-xl border border-[var(--mint-deep)]/25 bg-[var(--mint)]/40 p-4 text-sm leading-6"
                  >
                    {message}
                  </p>
                )}
                <Button loading={busy} className="h-12 w-full">
                  {mode === "sign-up"
                    ? "Create account"
                    : mode === "reset"
                      ? "Send reset email"
                      : mode === "new-password"
                        ? "Save new password"
                        : mode === "mfa"
                          ? "Verify and continue"
                          : magic
                            ? "Send sign-in link"
                            : "Sign in"}
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </form>
              {mode === "sign-in" && (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      disabled={busy}
                      className="h-11"
                      onClick={() => {
                        setMagic(!magic);
                        setError("");
                        setMessage("");
                      }}
                    >
                      <Mail size={15} className="mr-2" />
                      {magic ? "Use password" : "Magic link"}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11"
                      disabled={busy}
                      onClick={() => void passkey()}
                    >
                      <Fingerprint size={16} className="mr-2" />
                      Passkey
                    </Button>
                  </div>
                  {(capabilities.google || capabilities.apple) && (
                    <div className="mt-3 flex gap-3">
                      {capabilities.google && (
                        <Button
                          variant="outline"
                          disabled={busy}
                          className="flex-1"
                          onClick={() => void social("google")}
                        >
                          Continue with Google
                        </Button>
                      )}
                      {capabilities.apple && (
                        <Button
                          variant="outline"
                          disabled={busy}
                          className="flex-1"
                          onClick={() => void social("apple")}
                        >
                          Continue with Apple
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="mt-7 flex justify-between text-xs">
                    <Link
                      href="/auth/reset"
                      className="text-[var(--ink-soft)] hover:underline"
                    >
                      Forgot password?
                    </Link>
                    <Link
                      href="/sign-up"
                      className="font-semibold text-[var(--mint-deep)]"
                    >
                      Create an account →
                    </Link>
                  </div>
                </>
              )}
              {mode === "mfa" && (
                <button
                  className="mt-5 text-sm font-semibold text-[var(--mint-deep)]"
                  onClick={() => {
                    setBackup(!backup);
                    setCode("");
                  }}
                >
                  {backup ? "Use an authenticator code" : "Use a recovery code"}
                </button>
              )}
              {mode !== "sign-in" && (
                <Link
                  href="/sign-in"
                  className="mt-6 block text-xs font-semibold text-[var(--mint-deep)]"
                >
                  Back to sign in
                </Link>
              )}
              {capabilities.local && (
                <p className="mt-7 rounded-xl border border-dashed p-3 text-xs leading-6 text-[var(--ink-soft)]">
                  Local hosted environment · Read verification emails at{" "}
                  <a
                    href="http://localhost:18025"
                    className="font-semibold underline"
                  >
                    localhost:18025
                  </a>
                  .
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
