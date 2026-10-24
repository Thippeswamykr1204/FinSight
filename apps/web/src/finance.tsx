import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, idempotencyKey } from "./api";
import { useAuth } from "./auth";
import type { Account, Budget, Goal, Transaction } from "@finsight/shared";

export type Workspace = { id: string; name: string; currency: "INR" };
export type Membership = {
  role: "OWNER" | "EDITOR" | "VIEWER";
  workspace: Workspace;
};
export type Overview = {
  workspace: Workspace;
  accounts: Account[];
  budgets: Budget[];
  goals: Goal[];
  recent: Transaction[];
  totals: {
    income: number;
    expenses: number;
    saved: number;
    balance: number;
    score: number;
    savingRate: number;
    remaining: number;
  };
  trend: { month: string; type: string; total: number }[];
};
type FinanceContext = {
  memberships: Membership[];
  workspace: Workspace | null;
  role: Membership["role"] | null;
  overview: Overview | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  selectWorkspace: (id: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
  notice: string;
  setNotice: (value: string) => void;
};
const Context = createContext<FinanceContext | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user, refresh: refreshUser } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [role, setRole] = useState<Membership["role"] | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selected = useMemo(
    () => user?.activeWorkspaceId ?? memberships[0]?.workspace.id ?? null,
    [user?.activeWorkspaceId, memberships],
  );
  const load = async () => {
    if (!user) {
      setMemberships([]);
      setWorkspace(null);
      setOverview(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const available = await api.get<Membership[]>("/workspaces");
      setMemberships(available);
      const id =
        selected && available.some((entry) => entry.workspace.id === selected)
          ? selected
          : (available[0]?.workspace.id ?? null);
      if (id) {
        const membership = available.find(
          (entry) => entry.workspace.id === id,
        )!;
        setWorkspace(membership.workspace);
        setRole(membership.role);
        setOverview(await api.get<Overview>(`/workspaces/${id}/overview`));
      } else {
        setWorkspace(null);
        setRole(null);
        setOverview(null);
      }
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load your workspace.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [user?.id]);
  useEffect(() => {
    const clearSessionData = () => {
      setMemberships([]);
      setWorkspace(null);
      setRole(null);
      setOverview(null);
      setError("");
      setNotice("");
      setLoading(false);
    };
    window.addEventListener("finsight:session-ended", clearSessionData);
    return () =>
      window.removeEventListener("finsight:session-ended", clearSessionData);
  }, []);
  useEffect(() => {
    if (notice) {
      const timer = window.setTimeout(() => setNotice(""), 4500);
      return () => window.clearTimeout(timer);
    }
  }, [notice]);
  const selectWorkspace = async (id: string) => {
    await api.patch("/me", { activeWorkspaceId: id });
    await refreshUser();
    await load();
  };
  const createWorkspace = async (name: string) => {
    await api.post("/workspaces", { name }, idempotencyKey());
    await refreshUser();
    await load();
  };
  return (
    <Context.Provider
      value={{
        memberships,
        workspace,
        role,
        overview,
        loading,
        error,
        refresh: load,
        selectWorkspace,
        createWorkspace,
        notice,
        setNotice,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useFinance() {
  const context = useContext(Context);
  if (!context) throw new Error("FinanceProvider is missing");
  return context;
}
