import { useState } from "react";
import { Download, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "../api";
import { useAuth, useSessionSignOut } from "../auth";
import { useFinance } from "../finance";
import { Button, Card, Field, PageHeading } from "../components/ui";

export default function Settings() {
  const { user } = useAuth();
  const { signOut, busy: signingOut } = useSessionSignOut();
  const { workspace, role, refresh, setNotice } = useFinance();
  const [workspaceConfirmation, setWorkspaceConfirmation] = useState("");
  const [accountConfirmation, setAccountConfirmation] = useState("");
  const download = async (kind: "workspace" | "personal") => {
    try {
      const data = await api.get<unknown>(
        kind === "workspace"
          ? `/workspaces/${workspace?.id}/export`
          : "/me/export",
      );
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        kind === "workspace"
          ? "finsight-workspace.json"
          : "finsight-personal-data.json";
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice("Export prepared.");
    } catch (caught) {
      setNotice(
        caught instanceof Error ? caught.message : "Unable to export data.",
      );
    }
  };
  const deleteWorkspace = async () => {
    if (!workspace) return;
    try {
      await api.delete(`/workspaces/${workspace.id}`, {
        confirmation: workspaceConfirmation,
      });
      setWorkspaceConfirmation("");
      await refresh();
      setNotice("Workspace deleted.");
    } catch (caught) {
      setNotice(
        caught instanceof Error
          ? caught.message
          : "Unable to delete workspace.",
      );
    }
  };
  const deleteAccount = async () => {
    try {
      await api.delete("/me", { confirmation: accountConfirmation });
      await signOut();
    } catch (caught) {
      setNotice(
        caught instanceof Error ? caught.message : "Unable to delete account.",
      );
    }
  };
  return (
    <div>
      <PageHeading
        eyebrow="Control room"
        title="Keep the keys in your hands."
        description="Export what you own, review how the app works, and remove records deliberately."
      />
      <div className="grid grid-2">
        <Card>
          <div className="section-row">
            <div>
              <p className="eyebrow">Your profile</p>
              <h2 style={{ marginTop: 8 }}>{user?.name}</h2>
            </div>
            <ShieldCheck size={22} color="var(--mint-deep)" />
          </div>
          <p className="muted small" style={{ marginTop: 11 }}>
            {user?.email}
          </p>
          <div className="notice" style={{ marginTop: 22 }}>
            Access tokens expire quickly and refresh tokens rotate in secure
            HTTP-only cookies. Financial records never go to localStorage or the
            offline cache.
          </div>
          <Button
            variant="quiet"
            style={{ marginTop: 18 }}
            disabled={signingOut}
            onClick={() => void signOut()}
          >
            <LogOut size={15} />
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </Card>
        <Card>
          <p className="eyebrow">Data rights</p>
          <h2 style={{ marginTop: 8 }}>Take your data with you.</h2>
          <p className="muted small" style={{ marginTop: 12, lineHeight: 1.6 }}>
            Exports use integer minor units, ISO dates, and a documented format
            so they remain useful outside the app.
          </p>
          <div
            className="form-actions"
            style={{
              justifyContent: "flex-start",
              marginTop: 20,
              flexWrap: "wrap",
            }}
          >
            <Button variant="quiet" onClick={() => void download("personal")}>
              <Download size={15} />
              Personal export
            </Button>
            {workspace && (
              <Button
                variant="quiet"
                disabled={role !== "OWNER"}
                onClick={() => void download("workspace")}
              >
                <Download size={15} />
                Workspace export
              </Button>
            )}
          </div>
        </Card>
      </div>
      {workspace && (
        <Card style={{ marginTop: 18 }}>
          <p className="eyebrow">Workspace deletion</p>
          <h2 style={{ marginTop: 8 }}>Remove {workspace.name}</h2>
          <p className="muted small" style={{ marginTop: 12, lineHeight: 1.6 }}>
            This permanently removes the workspace ledger, budgets, goals,
            recurring rules, invitations, and audit records. Owners only.
          </p>
          <div className="form-grid" style={{ marginTop: 20 }}>
            <Field label={`Type DELETE ${workspace.name}`}>
              <input
                value={workspaceConfirmation}
                onChange={(event) =>
                  setWorkspaceConfirmation(event.target.value)
                }
                disabled={role !== "OWNER"}
              />
            </Field>
          </div>
          <Button
            variant="danger"
            disabled={
              role !== "OWNER" ||
              workspaceConfirmation !== `DELETE ${workspace.name}`
            }
            style={{ marginTop: 16 }}
            onClick={() => void deleteWorkspace()}
          >
            <Trash2 size={15} />
            Delete workspace
          </Button>
        </Card>
      )}
      <Card style={{ marginTop: 18 }}>
        <p className="eyebrow">Account deletion</p>
        <h2 style={{ marginTop: 8 }}>Close your FinSight account</h2>
        <p className="muted small" style={{ marginTop: 12, lineHeight: 1.6 }}>
          Delete or transfer every owned workspace first. Type the exact
          confirmation phrase to continue.
        </p>
        <div className="form-grid" style={{ marginTop: 20 }}>
          <Field label="Type DELETE MY ACCOUNT">
            <input
              value={accountConfirmation}
              onChange={(event) => setAccountConfirmation(event.target.value)}
            />
          </Field>
        </div>
        <Button
          variant="danger"
          disabled={accountConfirmation !== "DELETE MY ACCOUNT"}
          style={{ marginTop: 16 }}
          onClick={() => void deleteAccount()}
        >
          <Trash2 size={15} />
          Delete my account
        </Button>
      </Card>
      <p className="muted small" style={{ marginTop: 22 }}>
        Need help with a privacy request? Configure the operator contact in the
        deployment environment and publish the privacy notice for the regions
        you serve.
      </p>
    </div>
  );
}
