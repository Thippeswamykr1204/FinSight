import { useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowRight,
  Gauge,
  Landmark,
  Plus,
  Target,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import { displayDate, localDate, money } from "@finsight/shared";
import { useAuth } from "../auth";
import { useFinance } from "../finance";
import {
  Button,
  Card,
  EmptyState,
  LinkButton,
  Money,
  PageHeading,
} from "../components/ui";

export default function Dashboard() {
  const { user } = useAuth();
  const { overview, workspace, loading, error, createWorkspace, setNotice } =
    useFinance();
  if (loading && !overview)
    return (
      <div className="grid grid-2">
        <Card style={{ height: 390 }} />
        <Card style={{ height: 390 }} />
      </div>
    );
  if (error)
    return (
      <Card>
        <EmptyState
          title="Your workspace needs a moment"
          description={error}
          action={
            <Button onClick={() => window.location.reload()}>Try again</Button>
          }
        />
      </Card>
    );
  if (!workspace || !overview)
    return (
      <WorkspaceEmpty
        name={user?.name ?? "there"}
        onCreate={async (name) => {
          try {
            await createWorkspace(name);
            setNotice("Workspace created.");
          } catch (caught) {
            setNotice(
              caught instanceof Error
                ? caught.message
                : "Unable to create workspace.",
            );
          }
        }}
      />
    );
  const { totals } = overview;
  const chartMonths = [
    ...new Set(overview.trend.map((item) => item.month)),
  ].slice(-6);
  const chart = chartMonths.map((month) => ({
    month,
    income:
      overview.trend.find((row) => row.month === month && row.type === "income")
        ?.total ?? 0,
    expenses:
      overview.trend.find(
        (row) => row.month === month && row.type === "expense",
      )?.total ?? 0,
  }));
  const health =
    totals.score >= 75
      ? "Strong"
      : totals.score >= 50
        ? "Steady"
        : "Needs attention";
  return (
    <div>
      <PageHeading
        eyebrow={new Intl.DateTimeFormat("en-IN", {
          month: "long",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        }).format(new Date())}
        title="Your money, at a glance."
        description="A clear read on what changed and what deserves attention next."
      >
        <LinkButton to="/transactions?new=1">
          <Plus size={15} />
          Add money move
        </LinkButton>
      </PageHeading>
      <div className="hero-grid">
        <Card className="hero-card">
          <p className="eyebrow" style={{ color: "rgba(255,255,255,.58)" }}>
            Monthly cash flow
          </p>
          <p className="hero-value">
            <Money value={totals.saved} signed />
          </p>
          <p className="hero-caption">
            Income minus recorded expenses · {totals.savingRate}% savings rate
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <small>Income</small>
              <b>{money(totals.income)}</b>
            </div>
            <div className="hero-stat">
              <small>Expenses</small>
              <b>{money(totals.expenses)}</b>
            </div>
          </div>
          <div
            className="chart"
            style={{ borderBottomColor: "rgba(255,255,255,.16)" }}
          >
            {chart.length ? (
              chart.map((item) => (
                <div className="chart-column" key={item.month}>
                  <div className="chart-bars">
                    <span
                      className="chart-bar"
                      style={{
                        height: `${Math.max(5, Math.min(100, (item.income / Math.max(item.income, item.expenses, 1)) * 100))}%`,
                      }}
                    />
                    <span
                      className="chart-bar expense"
                      style={{
                        height: `${Math.max(5, Math.min(100, (item.expenses / Math.max(item.income, item.expenses, 1)) * 100))}%`,
                      }}
                    />
                  </div>
                  <small style={{ color: "rgba(255,255,255,.55)" }}>
                    {item.month.slice(5)}
                  </small>
                </div>
              ))
            ) : (
              <p className="hero-caption">
                Add transactions to see your cash-flow rhythm.
              </p>
            )}
          </div>
        </Card>
        <Card className="score-card">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="avatar">
              <Gauge size={18} />
            </span>
            <div style={{ textAlign: "left" }}>
              <h3>Financial health</h3>
              <p className="muted small">Based on recorded activity</p>
            </div>
          </div>
          <div
            className="score-ring"
            style={{ "--score": `${totals.score * 3.6}deg` } as CSSProperties}
          >
            <div className="score-inner">
              <b>{totals.score}</b>
              <span>{health}</span>
            </div>
          </div>
          <p className="muted small">
            {totals.saved >= 0
              ? "Recorded income covers this month’s expenses."
              : "Expenses are ahead of income. Review the categories that matter."}
          </p>
          <Link
            to="/insights"
            className="section-link"
            style={{ marginTop: 18 }}
          >
            Understand your score <ArrowRight size={14} />
          </Link>
        </Card>
      </div>
      <div className="grid grid-3" style={{ marginTop: 18 }}>
        <Metric
          title="Tracked net worth"
          value={totals.balance}
          detail={`${overview.accounts.length} manually tracked account${overview.accounts.length === 1 ? "" : "s"}`}
          icon={<Landmark size={18} />}
        />
        <Metric
          title="Goal savings"
          value={overview.goals.reduce((sum, goal) => sum + goal.saved, 0)}
          detail="Earmarked savings across active goals"
          icon={<Target size={18} />}
        />
        <Metric
          title="Budget room"
          value={totals.remaining}
          detail="Remaining in this month’s plan"
          icon={<WalletCards size={18} />}
        />
      </div>
      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <Card>
          <div className="section-row">
            <div>
              <p className="eyebrow">This month</p>
              <h2 style={{ marginTop: 8 }}>Spending plan</h2>
            </div>
            <Link to="/budgets" className="section-link">
              View budgets ↗
            </Link>
          </div>
          {overview.budgets.length ? (
            <div style={{ marginTop: 17 }}>
              {overview.budgets.slice(0, 5).map((budget) => (
                <div className="budget-row" key={budget.id}>
                  <div className="budget-meta">
                    <b>{budget.category}</b>
                    <small>
                      {money(budget.spent)} / {money(budget.limit)}
                    </small>
                  </div>
                  <div className="progress">
                    <span
                      style={{
                        width: `${Math.min(100, budget.limit ? (budget.spent / budget.limit) * 100 : 0)}%`,
                        background:
                          budget.spent > budget.limit
                            ? "var(--danger)"
                            : "var(--mint-strong)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Make a plan for this month"
              description="Set a budget to see your spending in context."
              action={<LinkButton to="/budgets">Set a budget</LinkButton>}
            />
          )}
        </Card>
        <Card>
          <div className="section-row">
            <div>
              <p className="eyebrow">Money moves</p>
              <h2 style={{ marginTop: 8 }}>Recent transactions</h2>
            </div>
            <Link to="/transactions" className="section-link">
              See all ↗
            </Link>
          </div>
          {overview.recent.length ? (
            <div className="transaction-list">
              {overview.recent.slice(0, 6).map((transaction) => (
                <Link
                  className="transaction-row"
                  to={`/transactions?category=${encodeURIComponent(transaction.category)}`}
                  key={transaction.id}
                >
                  <span className="transaction-avatar">
                    {transaction.merchant.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="transaction-meta">
                    <b>{transaction.merchant}</b>
                    <small>
                      {transaction.category} · {displayDate(transaction.date)}
                    </small>
                  </span>
                  <span
                    className={`transaction-amount ${transaction.type === "income" ? "income" : ""}`}
                  >
                    {transaction.type === "income" ? "+" : "−"}
                    {money(transaction.amount)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Your first money move"
              description="Add a transaction to begin seeing your month."
              action={
                <LinkButton to="/transactions?new=1">
                  Add transaction
                </LinkButton>
              }
            />
          )}
        </Card>
      </div>
      <p className="muted small" style={{ marginTop: 22 }}>
        {workspace.name} · INR · Report date {displayDate(localDate())} ·
        Figures reflect saved workspace records.
      </p>
    </div>
  );
}

function Metric({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: number;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <Card className="metric">
      <div className="section-row">
        <p className="eyebrow">{title}</p>
        <span style={{ color: "var(--mint-deep)" }}>{icon}</span>
      </div>
      <b>{money(value)}</b>
      <p>{detail}</p>
    </Card>
  );
}

function WorkspaceEmpty({
  name,
  onCreate,
}: {
  name: string;
  onCreate: (name: string) => Promise<void>;
}) {
  const [workspaceName, setWorkspaceName] = useState(`${name}'s money`);
  return (
    <div style={{ maxWidth: 760, margin: "70px auto" }}>
      <Card>
        <p className="eyebrow">A fresh view</p>
        <h1
          style={{
            margin: "15px 0 10px",
            fontFamily: "Newsreader, Georgia, serif",
            fontSize: 52,
            fontWeight: 500,
            letterSpacing: "-.06em",
          }}
        >
          Give your money a place to land.
        </h1>
        <p className="lede">
          Create a private workspace. It starts empty by design — the first
          insight should come from your records, not a demo dataset.
        </p>
        <label className="field" style={{ marginTop: 28 }}>
          <span>Workspace name</span>
          <input
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            maxLength={80}
          />
        </label>
        <Button
          style={{ marginTop: 18 }}
          onClick={() => void onCreate(workspaceName)}
        >
          Create workspace <ArrowRight size={15} />
        </Button>
      </Card>
    </div>
  );
}
