import { FormEvent, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { categories, localDate, money, parseMoney } from "@finsight/shared";
import { api, idempotencyKey } from "../api";
import { useFinance } from "../finance";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Money,
  PageHeading,
} from "../components/ui";

export default function Budgets() {
  const { workspace, overview, role, refresh, setNotice } = useFinance();
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const [editing, setEditing] = useState<{
    id?: string;
    category: string;
    limit: number;
  } | null>(null);
  if (!workspace || !overview)
    return (
      <Card>
        <EmptyState
          title="Create a workspace first"
          description="Budgets become useful once they are connected to your own transactions."
        />
      </Card>
    );
  const budgets = overview.budgets.filter((budget) => budget.month === month);
  const total = budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const spent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api.post(
        `/workspaces/${workspace.id}/budgets`,
        {
          category: String(form.get("category")),
          month,
          limit: parseMoney(String(form.get("amount"))),
        },
        idempotencyKey(),
      );
      setEditing(null);
      await refresh();
      setNotice("Budget saved.");
    } catch (caught) {
      setNotice(
        caught instanceof Error ? caught.message : "Unable to save budget.",
      );
    }
  };
  return (
    <div>
      <PageHeading
        eyebrow="Your plan"
        title="Give every rupee a direction."
        description="Flexible guardrails built around the life you actually live."
      >
        <input
          className="control"
          type="month"
          aria-label="Budget month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
        <Button
          disabled={role === "VIEWER"}
          onClick={() => setEditing({ category: "Groceries", limit: 0 })}
        >
          <Plus size={15} />
          Add budget
        </Button>
      </PageHeading>
      <div className="grid grid-3">
        <Metric label="Planned" value={total} />
        <Metric label="Spent in budgeted categories" value={spent} />
        <Metric label="Remaining" value={total - spent} />
      </div>
      <Card style={{ marginTop: 18 }}>
        <div className="section-row">
          <div>
            <p className="eyebrow">{month}</p>
            <h2 style={{ marginTop: 8 }}>Your spending plan</h2>
          </div>
          <span className="muted small">{budgets.length} categories · INR</span>
        </div>
        {budgets.length ? (
          <div style={{ marginTop: 18 }}>
            {budgets.map((budget) => {
              const percentage = budget.limit
                ? Math.round((budget.spent / budget.limit) * 100)
                : 0;
              return (
                <div className="budget-row" key={budget.id}>
                  <div className="budget-meta">
                    <div>
                      <b>{budget.category}</b>
                      <small style={{ display: "block", marginTop: 4 }}>
                        {percentage > 100
                          ? `${money(budget.spent - budget.limit)} over budget`
                          : `${money(budget.limit - budget.spent)} remaining`}
                      </small>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 9 }}
                    >
                      <small>
                        {money(budget.spent)} / {money(budget.limit)}
                      </small>
                      <button
                        className="icon-button"
                        aria-label={`Edit ${budget.category} budget`}
                        onClick={() =>
                          setEditing({
                            id: budget.id,
                            category: budget.category,
                            limit: budget.limit,
                          })
                        }
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="progress">
                    <span
                      style={{
                        width: `${Math.min(100, percentage)}%`,
                        background:
                          percentage > 100
                            ? "var(--danger)"
                            : "var(--mint-strong)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Make room for what matters"
            description="Add your first category budget for this month. Spending follows your transactions."
            action={
              <Button
                disabled={role === "VIEWER"}
                onClick={() =>
                  setEditing({ category: "Groceries", limit: 0 })
                }
              >
                Create your first budget
              </Button>
            }
          />
        )}
      </Card>
      <div className="notice" style={{ marginTop: 18 }}>
        A budget is a conversation with the month, not a punishment. Adjust a
        limit when priorities change.
      </div>
      {editing && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setEditing(null)}
        >
          <Card
            role="dialog"
            aria-modal="true"
            style={{
              width: "min(520px, calc(100vw - 30px))",
              margin: "12vh auto",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-row">
              <h2>{editing.id ? "Edit budget" : "Create a budget"}</h2>
              <button
                className="icon-button"
                onClick={() => setEditing(null)}
                aria-label="Close budget dialog"
              >
                ×
              </button>
            </div>
            <form className="auth-form" onSubmit={(event) => void save(event)}>
              <Field label="Category">
                <select name="category" defaultValue={editing.category}>
                  {categories
                    .filter((value: string) => value !== "Income")
                    .map((value: string) => (
                      <option key={value}>{value}</option>
                    ))}
                </select>
              </Field>
              <Field label="Monthly limit (INR)">
                <input
                  name="amount"
                  inputMode="decimal"
                  defaultValue={
                    editing.limit ? (editing.limit / 100).toFixed(2) : ""
                  }
                  required
                />
              </Field>
              <div className="form-actions">
                <Button
                  type="button"
                  variant="quiet"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save budget</Button>
              </div>
            </form>
            {editing.id && (
              <Button
                variant="danger"
                style={{ marginTop: 12 }}
                onClick={async () => {
                  await api.delete(
                    `/workspaces/${workspace.id}/budgets/${editing.id}`,
                  );
                  setEditing(null);
                  await refresh();
                  setNotice("Budget removed.");
                }}
              >
                <Trash2 size={15} />
                Remove budget
              </Button>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="metric">
      <p className="eyebrow">{label}</p>
      <b>
        <Money value={value} />
      </b>
    </Card>
  );
}
