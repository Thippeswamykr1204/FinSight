import { FormEvent, useState } from "react";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import { accountTypes, money, parseMoney } from "@finsight/shared";
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

export default function Accounts() {
  const { workspace, overview, role, refresh, setNotice } = useFinance();
  const [open, setOpen] = useState(false);
  if (!workspace || !overview)
    return (
      <Card>
        <EmptyState
          title="Create a workspace first"
          description="Accounts are the anchors for your balances."
        />
      </Card>
    );
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api.post(
        `/workspaces/${workspace.id}/accounts`,
        {
          name: String(form.get("name")),
          type: String(form.get("type")),
          openingBalance:
            Number(form.get("openingBalance")) < 0
              ? -parseMoney(String(form.get("openingBalance")).replace("-", ""))
              : parseMoney(String(form.get("openingBalance"))),
        },
        idempotencyKey(),
      );
      setOpen(false);
      await refresh();
      setNotice("Account added.");
    } catch (caught) {
      setNotice(
        caught instanceof Error ? caught.message : "Unable to add account.",
      );
    }
  };
  return (
    <div>
      <PageHeading
        eyebrow="Your anchors"
        title="Know where the money lives."
        description="Track the accounts you care about without connecting a bank or giving up control."
      >
        <Button disabled={role === "VIEWER"} onClick={() => setOpen(true)}>
          <Plus size={15} />
          Add account
        </Button>
      </PageHeading>
      {overview.accounts.length ? (
        <div className="grid grid-3">
          {overview.accounts.map((account) => (
            <Card key={account.id}>
              <div className="section-row">
                <span className="avatar">
                  <CreditCard size={18} />
                </span>
                <span className="muted small">{account.type}</span>
              </div>
              <h2 style={{ marginTop: 22 }}>{account.name}</h2>
              <p
                className="hero-value"
                style={{ margin: "27px 0 8px", fontSize: 34 }}
              >
                <Money value={account.balance} signed />
              </p>
              <p className="muted small">
                Opening balance {money(account.openingBalance)}
              </p>
              <Button
                variant="quiet"
                disabled={role === "VIEWER"}
                style={{ marginTop: 20 }}
                onClick={async () => {
                  try {
                    await api.delete(
                      `/workspaces/${workspace.id}/accounts/${account.id}`,
                    );
                    await refresh();
                    setNotice("Account removed.");
                  } catch (caught) {
                    setNotice(
                      caught instanceof Error
                        ? caught.message
                        : "Unable to remove account.",
                    );
                  }
                }}
              >
                <Trash2 size={15} />
                Remove
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="Start with one account"
            description="A savings account, cash balance, or card is enough to begin."
            action={
              <Button
                disabled={role === "VIEWER"}
                onClick={() => setOpen(true)}
              >
                Add your first account
              </Button>
            }
          />
        </Card>
      )}
      {open && (
        <div className="mobile-drawer-backdrop" onClick={() => setOpen(false)}>
          <Card
            role="dialog"
            aria-modal="true"
            style={{
              width: "min(520px, calc(100vw - 30px))",
              margin: "12vh auto",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Add an account</h2>
            <form className="auth-form" onSubmit={(event) => void save(event)}>
              <Field label="Account name">
                <input
                  name="name"
                  required
                  autoFocus
                  placeholder="Primary savings"
                />
              </Field>
              <Field label="Type">
                <select name="type" defaultValue="Savings">
                  {accountTypes.map((value: string) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="Opening balance (INR)"
                hint="Use a minus sign for a liability or overdraft."
              >
                <input
                  name="openingBalance"
                  required
                  inputMode="decimal"
                  placeholder="0.00"
                />
              </Field>
              <div className="form-actions">
                <Button
                  type="button"
                  variant="quiet"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save account</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
