import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Lightbulb } from "lucide-react";
import { amortize, goalMonthly, money, sipProjection } from "@finsight/shared";
import { api } from "../api";
import { useFinance } from "../finance";
import { Button, Card, EmptyState, Field, PageHeading } from "../components/ui";

type InsightData = {
  summary: {
    score: number;
    savingRate: number;
    saved: number;
    remaining: number;
  };
  cashFlow: { month: string; income: number; expenses: number }[];
  categories: { category: string; total: number }[];
};
export default function Insights() {
  const { workspace, overview, setNotice } = useFinance();
  const [data, setData] = useState<InsightData | null>(null);
  const [calculator, setCalculator] = useState("sip");
  const [result, setResult] = useState("");
  useEffect(() => {
    if (workspace)
      void api
        .get<InsightData>(`/workspaces/${workspace.id}/insights`)
        .then(setData)
        .catch((caught) =>
          setNotice(
            caught instanceof Error
              ? caught.message
              : "Unable to load insights.",
          ),
        );
  }, [workspace?.id]);
  if (!workspace || !overview)
    return (
      <Card>
        <EmptyState
          title="Create a workspace first"
          description="Insights are calculated from the records you choose to keep."
        />
      </Card>
    );
  const runCalculator = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const amount = Math.round(Number(form.get("amount")) * 100);
      const rate = Number(form.get("rate"));
      const months = Number(form.get("months"));
      if (calculator === "sip") {
        const value = sipProjection(amount, rate, months);
        setResult(
          `${money(value.value)} projected value · ${money(value.growth)} growth`,
        );
      } else if (calculator === "emi") {
        const value = amortize(amount, rate, months);
        setResult(
          `${money(value.payment)} estimated monthly payment · ${money(value.interest)} interest`,
        );
      } else {
        const value = goalMonthly(
          amount,
          Math.round(Number(form.get("saved")) * 100),
          months,
        );
        setResult(`${money(value)} per month to reach the target`);
      }
    } catch (caught) {
      setResult(
        caught instanceof Error
          ? caught.message
          : "Check the calculator inputs.",
      );
    }
  };
  return (
    <div>
      <PageHeading
        eyebrow="Signals, not noise"
        title="Understand what the ledger is saying."
        description="These views describe recorded activity. They are not a forecast, recommendation, or promise."
      />
      <div className="grid grid-2">
        <Card>
          <div className="section-row">
            <div>
              <p className="eyebrow">Cash flow</p>
              <h2 style={{ marginTop: 8 }}>The last six months</h2>
            </div>
            <Lightbulb size={20} color="var(--mint-deep)" />
          </div>
          <div className="chart">
            {(data?.cashFlow ?? []).map((item) => {
              const scale = Math.max(item.income, item.expenses, 1);
              return (
                <div className="chart-column" key={item.month}>
                  <div className="chart-bars">
                    <span
                      className="chart-bar"
                      style={{
                        height: `${Math.max(4, (item.income / scale) * 100)}%`,
                      }}
                    />
                    <span
                      className="chart-bar expense"
                      style={{
                        height: `${Math.max(4, (item.expenses / scale) * 100)}%`,
                      }}
                    />
                  </div>
                  <small>{item.month.slice(0, 3)}</small>
                </div>
              );
            })}
          </div>
          <div className="section-row" style={{ marginTop: 15 }}>
            <span className="muted small">Mint · income</span>
            <span className="muted small">Ember · expenses</span>
          </div>
        </Card>
        <Card>
          <p className="eyebrow">Where it goes</p>
          <h2 style={{ marginTop: 8 }}>Recorded spending mix</h2>
          {data?.categories.length ? (
            <div style={{ marginTop: 20 }}>
              {data.categories.map((item) => (
                <div className="budget-row" key={item.category}>
                  <div className="budget-meta">
                    <b>{item.category}</b>
                    <small>{money(item.total)}</small>
                  </div>
                  <div className="progress">
                    <span
                      style={{
                        width: `${Math.max(5, (item.total / Math.max(data.categories[0]?.total ?? 1, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No category pattern yet"
              description="Add expenses across a month to see the mix."
            />
          )}
        </Card>
      </div>
      <Card style={{ marginTop: 18 }}>
        <p className="eyebrow">A useful signal</p>
        <h2 style={{ marginTop: 8 }}>
          {(data?.summary.score ?? overview.totals.score) >= 70
            ? "Your recorded month has a steady rhythm."
            : "The next useful move is visibility."}
        </h2>
        <p className="lede">
          {(data?.summary.saved ?? overview.totals.saved) >= 0
            ? `Recorded income is ahead of expenses by ${money(data?.summary.saved ?? overview.totals.saved)} this month. Upcoming bills and unrecorded purchases can change that picture.`
            : "Expenses are ahead of recorded income. Start by reviewing the largest categories, not every line item."}
        </p>
        <a
          className="section-link"
          href="#calculators"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 18,
          }}
        >
          Try a planning calculator <ArrowRight size={14} />
        </a>
      </Card>
      <Card id="calculators" style={{ marginTop: 18 }}>
        <div className="section-row">
          <div>
            <p className="eyebrow">Planning desk</p>
            <h2 style={{ marginTop: 8 }}>Run a simple scenario</h2>
          </div>
          <select
            className="control"
            style={{ width: 150 }}
            value={calculator}
            onChange={(event) => {
              setCalculator(event.target.value);
              setResult("");
            }}
          >
            <option value="sip">SIP estimate</option>
            <option value="emi">EMI estimate</option>
            <option value="goal">Goal pace</option>
          </select>
        </div>
        <form
          className="form-grid"
          style={{ marginTop: 22 }}
          onSubmit={runCalculator}
        >
          <Field
            label={
              calculator === "goal"
                ? "Target amount (INR)"
                : calculator === "emi"
                  ? "Principal (INR)"
                  : "Monthly investment (INR)"
            }
          >
            <input
              name="amount"
              required
              inputMode="decimal"
              placeholder="10000"
            />
          </Field>
          {calculator === "goal" ? (
            <Field label="Already saved (INR)">
              <input
                name="saved"
                required
                inputMode="decimal"
                defaultValue="0"
              />
            </Field>
          ) : (
            <Field
              label="Annual rate (%)"
              hint="Assumption only; not a guarantee."
            >
              <input
                name="rate"
                required
                type="number"
                min="0"
                max="40"
                step="0.1"
                defaultValue="12"
              />
            </Field>
          )}
          <Field label="Time horizon (months)">
            <input
              name="months"
              required
              type="number"
              min="1"
              max="600"
              defaultValue="36"
            />
          </Field>
          <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
            <Button type="submit">Calculate</Button>
          </div>
        </form>
        {result && (
          <div className="notice" style={{ marginTop: 18 }}>
            {result}
          </div>
        )}
      </Card>
    </div>
  );
}
