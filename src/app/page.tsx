import Link from "next/link";
import {
  ArrowRight,
  Check,
  Compass,
  Layers,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-shell";

export default function LandingPage() {
  return (
    <div className="overflow-hidden bg-[var(--canvas)]">
      <SiteHeader />
      <main>
        <section className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[.9fr,1.1fr] lg:px-10 lg:pb-36">
          <div className="pointer-events-none absolute -right-48 -top-36 h-[32rem] w-[32rem] rounded-full bg-[#b8f2d0] opacity-50 blur-3xl" />
          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#167852]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#178457]" /> A
              clearer financial perspective
            </p>
            <h1 className="mt-8 text-balance text-[clamp(3.8rem,7vw,6.7rem)] font-semibold leading-[.94] tracking-[-.075em]">
              Money, with{" "}
              <span className="font-display font-normal italic text-[#167852]">
                perspective.
              </span>
            </h1>
            <p className="mt-8 max-w-lg text-lg leading-8 text-[var(--ink-soft)]">
              A calmer way to see your money, make a plan, and build a little
              momentum. Less noise. More of the picture that matters.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center gap-3 rounded-xl bg-[#101b16] px-6 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-1"
              >
                See your money clearly <ArrowRight size={17} />
              </Link>
              <Link
                href="/features"
                className="rounded-xl px-3 py-3 text-sm font-semibold text-[var(--ink-soft)] hover:bg-[var(--surface-muted)]"
              >
                Take a closer look ↗
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-5 text-xs text-[var(--ink-soft)]">
              {["No signup", "No bank connection", "Sample data included"].map(
                (item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <Check size={13} className="text-[#167852]" />
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-5 rounded-[40px] bg-[#b8f2d0]/40 blur-2xl" />
            <div className="relative rounded-[26px] border border-[#cbd7d0] bg-white p-4 shadow-[0_25px_80px_rgba(20,50,30,.13)] sm:p-5">
              <div className="flex items-center justify-between border-b pb-4">
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#101b16] text-[#b8f2d0]">
                    <Compass size={16} />
                  </span>
                  Your financial picture
                </span>
                <span className="rounded-full bg-[#eef2f0] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#4f5c58]">
                  Illustrative preview
                </span>
              </div>
              <div className="mt-4 rounded-[20px] bg-[#101b16] p-6 text-white sm:p-7">
                <div className="flex justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/65">
                    Monthly cash flow
                  </p>
                  <TrendingUp size={18} className="text-[#b8f2d0]" />
                </div>
                <p className="mt-5 text-5xl font-semibold tracking-[-.065em]">
                  ₹42,067<span className="text-3xl text-white/55">.50</span>
                </p>
                <p className="mt-3 text-xs text-white/65">
                  Room for today. Progress toward tomorrow.
                </p>
                <svg
                  viewBox="0 0 420 100"
                  className="mt-7 h-28 w-full overflow-visible"
                  fill="none"
                  role="img"
                  aria-label="Illustrative cash flow trend"
                >
                  <path
                    d="M0 82 C30 75 29 89 52 66 S88 71 113 54 S142 63 165 40 S202 51 221 30 S254 37 279 18 S308 35 337 15 S374 24 420 2"
                    stroke="#b8f2d0"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0 89 C50 74 68 80 105 76 S153 65 186 71 S259 63 303 68 S356 55 420 54"
                    stroke="#e7a281"
                    strokeWidth="2"
                    strokeDasharray="5 6"
                  />
                  <circle cx="420" cy="2" r="5" fill="#54d99a" />
                </svg>
                <div className="mt-3 flex justify-between text-[10px] text-white/65">
                  <span>Your income</span>
                  <span>Your expenses</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border bg-[#fbfcfb] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#5f7068]">
                    Emergency fund
                  </p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight">
                    ₹2,40,000
                  </p>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#eef2f0]">
                    <div className="h-full w-[70%] rounded-full bg-[#178457]" />
                  </div>
                  <p className="mt-2 text-[10px] text-[#5f7068]">
                    70% of the way there
                  </p>
                </div>
                <div className="rounded-2xl border bg-[#fbfcfb] p-4">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#e9edff] text-[#4c6fff]">
                    <Sparkles size={15} />
                  </span>
                  <p className="mt-3 text-xs font-semibold">A useful signal</p>
                  <p className="mt-2 text-xs leading-5 text-[#4f5c58]">
                    Your spending plan has room to breathe.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="border-y bg-white px-5 py-24 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <p className="eyebrow">A little less noise</p>
            <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-.055em] sm:text-6xl">
              Your money has a story.
              <br />
              <span className="font-display font-normal italic text-[#167852]">
                Learn to read it.
              </span>
            </h2>
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: Layers,
                  title: "Bring the picture together.",
                  copy: "Cash, credit, and investments in one place. Add your accounts or bring a statement, then see what the totals are telling you.",
                },
                {
                  icon: Compass,
                  title: "Give your plans direction.",
                  copy: "Make room for everyday life and the bigger things ahead. Budgets and goals turn good intentions into visible progress.",
                },
                {
                  icon: Sparkles,
                  title: "Understand what changed.",
                  copy: "Follow your cash flow, explore spending categories, and see the assumptions behind each insight. No mystery scores.",
                },
              ].map(({ icon: Icon, title, copy }, index) => (
                <article key={title} className="surface surface-hover p-7">
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-2xl ${index === 1 ? "bg-[#e9edff] text-[#4c6fff]" : "bg-[#dcf5e7] text-[#167852]"}`}
                  >
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-8 text-xl font-semibold tracking-tight">
                    {title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
                    {copy}
                  </p>
                  <Link
                    href="/features"
                    className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-[#167852]"
                  >
                    Explore the product <ArrowRight size={14} />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto grid max-w-7xl gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-10">
          <div>
            <p className="eyebrow">Built for real life</p>
            <h2 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-[-.055em] sm:text-5xl">
              A financial habit.
              <br />
              Not a second job.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-8 text-[var(--ink-soft)]">
              Open your workspace. Notice a pattern. Take one useful step.
              FinSight is designed to make the next decision easier, without
              turning your life into a spreadsheet.
            </p>
            <Link
              href="/dashboard"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#167852]"
            >
              Find your next step <ArrowRight size={16} />
            </Link>
          </div>
          <div className="rounded-[28px] bg-[#e7eee9] p-6 sm:p-9">
            <p className="eyebrow">Your weekly check-in</p>
            <div className="mt-6 space-y-3">
              {[
                ["Review", "What changed since last time?"],
                ["Plan", "What needs room this month?"],
                ["Progress", "What is one step toward your goal?"],
              ].map(([label, text], index) => (
                <div
                  key={label}
                  className="flex items-center gap-4 rounded-2xl bg-white p-5"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eef2f0] text-sm font-semibold text-[#167852]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-[#167852]">
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-medium">{text}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 flex items-center gap-2 text-xs text-[#4f5c58]">
              <ShieldCheck size={15} /> Demo data stays in this browser.
            </p>
          </div>
        </section>
        <section className="bg-[#101b16] px-5 py-24 text-white sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-10 lg:flex-row lg:items-end">
            <div>
              <p className="eyebrow text-[#b8f2d0]">
                A clearer morning starts here
              </p>
              <h2 className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-[-.06em] sm:text-6xl">
                Know where you are.
                <br />
                Decide where you go.
              </h2>
            </div>
            <div className="max-w-sm">
              <p className="text-base leading-7 text-white/70">
                Try the complete browser-local demo. No account, no bank
                credentials, no credit card.
              </p>
              <Link
                href="/dashboard"
                className="mt-7 inline-flex items-center gap-3 rounded-xl bg-[#b8f2d0] px-5 py-4 text-sm font-semibold text-[#134f36]"
              >
                Open FinSight <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
