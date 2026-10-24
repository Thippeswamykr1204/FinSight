import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../auth";
import { Brand } from "../components/AppShell";
import { Button, Field, PasswordField } from "../components/ui";

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { signIn, signUp, signOutNotice } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [passwordResetKey, setPasswordResetKey] = useState(0);
  const register = mode === "register";
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (register) await signUp(name, email, password, accepted);
      else await signIn(email, password);
      setPasswordResetKey((current) => current + 1);
      navigate("/dashboard");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to continue.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <Brand />
        <div>
          <p className="eyebrow" style={{ color: "#7ee3aa" }}>
            Money, with perspective.
          </p>
          <h1>A clearer next step starts with a clearer picture.</h1>
          <p>
            FinSight is a quiet place to record what happened, understand the
            pattern, and decide what deserves your attention next.
          </p>
        </div>
        <small style={{ color: "rgba(255,255,255,.45)", fontSize: 11 }}>
          Exact paise · Private workspaces · India-first
        </small>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <p className="eyebrow">
            {register ? "Create your private workspace" : "Welcome back"}
          </p>
          <h1>{register ? "Begin with clarity." : "Good to see you."}</h1>
          <p>
            {register
              ? "Your first workspace starts empty. That is the point."
              : "Sign in to pick up where you left off."}
          </p>
          <form className="auth-form" onSubmit={(event) => void submit(event)}>
            {register && (
              <Field label="Your name">
                <input
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="A name you’ll recognize"
                />
              </Field>
            )}
            <Field label="Email address">
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            {register ? (
              <div className="field">
                <span id="password-label">Password</span>
                <PasswordField
                  id="password"
                  aria-labelledby="password-label"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                  resetKey={passwordResetKey}
                />
                <small>
                  At least 12 characters. A phrase is easier to remember.
                </small>
              </div>
            ) : (
              <div className="field">
                <span id="password-label">Password</span>
                <PasswordField
                  id="password"
                  aria-labelledby="password-label"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                  resetKey={passwordResetKey}
                />
              </div>
            )}
            {register && (
              <label className="privacy-check">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(event) => setAccepted(event.target.checked)}
                  required
                />
                <span>
                  I accept the <Link to="/privacy">privacy notice</Link> and
                  understand this is a manually maintained ledger.
                </span>
              </label>
            )}
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            {signOutNotice && (
              <p className="notice" role="status">
                {signOutNotice}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? "Working…" : register ? "Create account" : "Sign in"}
              <ArrowRight size={15} />
            </Button>
          </form>
          <p className="auth-switch">
            {register ? "Already have an account? " : "New to FinSight? "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
