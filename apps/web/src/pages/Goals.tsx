import { FormEvent, useState, type ReactNode } from "react";
import { ArrowUpRight, Plus, Target, X } from "lucide-react";
import { money, parseMoney } from "@finsight/shared";
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

export default function Goals() {
  const { workspace, overview, role, refresh, setNotice } = useFinance();
  const [dialog, setDialog] = useState<"create" | { id: string } | null>(null);
  if (!workspace || !overview)
    return (
      <Card>
        <EmptyState
          title="Create a workspace first"
          description="Goals give future spending a visible shape."
        />
      </Card>
    );
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api.post(
        `/workspaces/${workspace.id}/goals`,
        {
          name: String(form.get("name")),
          target: parseMoney(String(form.get("target"))),
          due: String(form.get("due")),
        },
        idempotencyKey(),
      );
      setDialog(null);
      await refresh();
      setNotice("Goal created.");
    } catch (caught) {
      setNotice(
        caught instanceof Error ? caught.message : "Unable to create goal.",
      );
    }
  };
  const contribute = async (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api.post(
        `/workspaces/${workspace.id}/goals/${id}/contributions`,
        { amount: parseMoney(String(form.get("amount"))) },
        idempotencyKey(),
      );
      setDialog(null);
      await refresh();
      setNotice("Contribution recorded.");
    } catch (caught) {
      setNotice(
        caught instanceof Error
          ? caught.message
          : "Unable to record contribution.",
      );
    }
  };
  const contributionId =
    typeof dialog === "object" && dialog ? dialog.id : null;
  return (
    <div>
      <PageHeading
        eyebrow="Future you"
        title="Give the next chapter a target."
        description="Goals turn a vague intention into a visible amount and a date."
      >
        <Button
          disabled={role === "VIEWER"}
          onClick={() => setDialog("create")}
        >
          <Plus size={15} />
          New goal
        </Button>
      </PageHeading>
      {overview.goals.length ? (
        <div className="grid grid-2">
          {overview.goals.map((goal) => {
            const percent = Math.min(
              100,
              goal.target ? (goal.saved / goal.target) * 100 : 0,
            );
            return (
              <Card key={goal.id}>
                <div className="section-row">
                  <span className="avatar">
                    <Target size={18} />
                  </span>
                  <span className="muted small">Due {goal.due}</span>
                </div>
                <h2 style={{ marginTop: 20 }}>{goal.name}</h2>
                <p
                  className="hero-value"
                  style={{ margin: "24px 0 8px", fontSize: 38 }}
                >
                  <Money value={goal.saved} />
                </p>
                <p className="muted small">
                  of {money(goal.target)} saved · {Math.round(percent)}%
                </p>
                <div className="progress" style={{ marginTop: 18 }}>
                  <span style={{ width: `${percent}%` }} />
                </div>
                <Button
                  variant="quiet"
                  disabled={role === "VIEWER"}
                  style={{ marginTop: 20 }}
                  onClick={() => setDialog({ id: goal.id })}
                >
                  Record contribution <ArrowUpRight size={15} />
                </Button>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="Make future spending visible"
            description="Create a goal for a reserve, a trip, or something you want to stop postponing."
            action={
              <Button
                disabled={role === "VIEWER"}
                onClick={() => setDialog("create")}
              >
                Create your first goal
              </Button>
            }
          />
        </Card>
      )}
      {dialog === "create" && (
        <Modal title="Create a goal" onClose={() => setDialog(null)}>
          <form className="auth-form" onSubmit={(event) => void create(event)}>
            <Field label="Goal name">
              <input
                name="name"
                required
                autoFocus
                placeholder="Emergency reserve"
              />
            </Field>
            <Field label="Target amount (INR)">
              <input
                name="target"
                required
                inputMode="decimal"
                placeholder="100000"
              />
            </Field>
            <Field label="Target date">
              <input name="due" required type="date" />
            </Field>
            <div className="form-actions">
              <Button
                type="button"
                variant="quiet"
                onClick={() => setDialog(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Create goal</Button>
            </div>
          </form>
        </Modal>
      )}
      {contributionId && (
        <Modal title="Record a contribution" onClose={() => setDialog(null)}>
          <form
            className="auth-form"
            onSubmit={(event) => void contribute(event, contributionId)}
          >
            <Field label="Contribution (INR)">
              <input
                name="amount"
                required
                inputMode="decimal"
                autoFocus
                placeholder="5000"
              />
            </Field>
            <div className="form-actions">
              <Button
                type="button"
                variant="quiet"
                onClick={() => setDialog(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Record contribution</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mobile-drawer-backdrop" onClick={onClose}>
      <Card
        role="dialog"
        aria-modal="true"
        style={{ width: "min(520px, calc(100vw - 30px))", margin: "12vh auto" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="section-row">
          <h2>{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ marginTop: 20 }}>{children}</div>
      </Card>
    </div>
  );
}
