import { ArrowRight, Check, Eye, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Brand } from "../components/AppShell";
import { Button, LinkButton } from "../components/ui";

export default function Landing() {
  return (
    <div className="public-page">
      <nav className="public-nav">
        <Brand />
        <div className="public-nav-links">
          <Link to="#principles">Principles</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/login">Sign in</Link>
          <LinkButton to="/register">
            Start with clarity <ArrowRight size={15} />
          </LinkButton>
        </div>
      </nav>
      <main>
        <section className="landing-hero">
          <div className="landing-copy">
            <p className="eyebrow">A calmer financial operating system</p>
            <h1>
              See the shape of your money <em>before</em> the next decision.
            </h1>
            <p>
              FinSight brings the everyday ledger, the monthly plan, and the
              signals that matter into one private workspace. No bank connection
              required. No noise disguised as insight.
            </p>
            <div className="landing-actions">
              <LinkButton to="/register">
                Create your workspace <ArrowRight size={15} />
              </LinkButton>
              <Button
                variant="quiet"
                onClick={() =>
                  document
                    .getElementById("principles")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                How it works
              </Button>
            </div>
          </div>
          <div
            className="landing-art"
            aria-label="Illustration of a finance dashboard"
          >
            <div className="art-card">
              <small>Tracked balance · INR</small>
              <b>₹2,48,620</b>
              <small>Cash flow this month</small>
              <div className="art-card-line">
                <span style={{ width: "72%" }} />
              </div>
              <div className="art-card-line">
                <span style={{ width: "46%", background: "#f0a37b" }} />
              </div>
            </div>
          </div>
        </section>
        <section id="principles" className="landing-proof">
          <article className="proof">
            <Eye size={21} color="var(--mint-deep)" />
            <b>Facts before forecasts</b>
            <p>
              Every total comes from the records you choose to keep. Signals
              explain themselves.
            </p>
          </article>
          <article className="proof">
            <ShieldCheck size={21} color="var(--mint-deep)" />
            <b>Private by construction</b>
            <p>
              Short-lived access, rotating sessions, encrypted sensitive fields,
              and no financial data in the offline cache.
            </p>
          </article>
          <article className="proof">
            <Sparkles size={21} color="var(--mint-deep)" />
            <b>Made for real life</b>
            <p>
              Exact paise, Indian number formatting, April financial years, and
              a workspace that starts empty.
            </p>
          </article>
        </section>
        <section
          className="card"
          style={{
            maxWidth: 1280,
            margin: "80px auto 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 22,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p className="eyebrow">A useful beginning</p>
            <h2
              style={{
                marginTop: 12,
                fontFamily: "Newsreader, Georgia, serif",
                fontSize: 34,
                fontWeight: 500,
              }}
            >
              Start with one account and one honest month.
            </h2>
          </div>
          <LinkButton to="/register">
            Open FinSight <Check size={15} />
          </LinkButton>
        </section>
      </main>
    </div>
  );
}
