"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  emptyState,
  preferencesInput,
  stateSchema,
  type FinanceCommand,
  type FinanceState,
} from "@finsight/shared";
import { api, ApiError } from "@/lib/hosted/client";

export type WorkspaceMembership = {
  role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";
  workspace: { id: string; name: string; currency: string };
};
type Context = {
  state: FinanceState;
  update: (updater: (state: FinanceState) => FinanceState) => Promise<void>;
  command: <T = Record<string, unknown>>(command: FinanceCommand) => Promise<T>;
  selectWorkspace: (id: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<{ id: string }>;
  refresh: () => Promise<void>;
  workspace: WorkspaceMembership["workspace"] | null;
  memberships: WorkspaceMembership[];
  role: WorkspaceMembership["role"] | null;
  notice: (message: string) => void;
  ready: boolean;
  error: string;
  expired: boolean;
  offline: boolean;
};
const FinanceContext = createContext<Context | null>(null);
const publicPaths = [
  "/",
  "/features",
  "/pricing",
  "/faq",
  "/terms",
  "/privacy",
  "/calculators",
  "/login",
];

export function FinanceProvider({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const publicRoute =
    publicPaths.includes(path) || path.startsWith("/reports/");
  const [state, setState] = useState<FinanceState>(() => emptyState());
  const current = useRef(state);
  const [workspace, setWorkspace] = useState<Context["workspace"]>(null);
  const scope = useRef<string | null>(null);
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>([]);
  const [role, setRole] = useState<Context["role"]>(null);
  const [ready, setReady] = useState(publicRoute);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [offline, setOffline] = useState(false);
  const pending = useRef(new Map<string, string>());
  const requestSequence = useRef(0);
  const setCurrent = useCallback((next: FinanceState) => {
    current.current = next;
    setState(next);
  }, []);
  const loadWorkspace = useCallback(
    async (id: string, sequence?: number) => {
      const result = await api<{
        workspace: NonNullable<Context["workspace"]>;
        role: NonNullable<Context["role"]>;
        state: FinanceState;
      }>(`/workspaces/${id}/state`);
      if (sequence !== undefined && sequence !== requestSequence.current)
        return;
      setCurrent(stateSchema.parse(result.state));
      scope.current = result.workspace.id;
      setWorkspace(result.workspace);
      setRole(result.role);
      setError("");
      setExpired(false);
      setReady(true);
    },
    [setCurrent],
  );
  const refresh = useCallback(async () => {
    if (publicRoute) {
      setReady(true);
      return;
    }
    const sequence = ++requestSequence.current;
    try {
      const me = await api<{
        profile: { name: string };
        preferences: FinanceState & { activeWorkspaceId: string | null };
      }>("/me");
      const available = await api<WorkspaceMembership[]>("/workspaces");
      if (sequence !== requestSequence.current) return;
      setMemberships(available);
      const requested = new URLSearchParams(window.location.search).get(
        "workspace",
      );
      const id = [
        requested,
        scope.current,
        me.preferences.activeWorkspaceId,
        available[0]?.workspace.id,
      ].find((candidate) =>
        available.some((member) => member.workspace.id === candidate),
      );
      if (id) await loadWorkspace(id, sequence);
      else {
        scope.current = null;
        setWorkspace(null);
        setRole(null);
        setCurrent(
          stateSchema.parse({
            ...emptyState(me.profile.name.slice(0, 60)),
            ...me.preferences,
            accounts: [],
            transactions: [],
            budgets: [],
            goals: [],
          }),
        );
        setReady(true);
        setError("");
        if (
          ![
            "/onboarding",
            "/workspaces",
            "/security",
            "/invitations",
            "/settings",
            "/billing",
          ].includes(path)
        )
          router.replace("/onboarding");
      }
    } catch (caught) {
      if (sequence !== requestSequence.current) return;
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load your workspace.",
      );
      if (caught instanceof ApiError && caught.status === 401) {
        setExpired(true);
        router.replace(
          `/sign-in?error=session_expired&next=${encodeURIComponent(path)}`,
        );
      }
      setReady(false);
    }
  }, [publicRoute, path, router, loadWorkspace, setCurrent]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    const online = () => {
      setOffline(false);
      void refresh();
    };
    const offlineEvent = () => setOffline(true);
    const expiry = () => {
      setExpired(true);
      setError("Your session has expired. Sign in again to continue.");
    };
    const focus = () => {
      if (navigator.onLine) void refresh();
    };
    setOffline(!navigator.onLine);
    window.addEventListener("online", online);
    window.addEventListener("offline", offlineEvent);
    window.addEventListener("focus", focus);
    window.addEventListener("finsight:session-expired", expiry);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offlineEvent);
      window.removeEventListener("focus", focus);
      window.removeEventListener("finsight:session-expired", expiry);
    };
  }, [refresh]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(timer);
  }, [message]);

  async function update(updater: (current: FinanceState) => FinanceState) {
    const next = stateSchema.parse(updater(current.current));
    const body = preferencesInput.parse(
      Object.fromEntries(
        Object.keys(preferencesInput.shape)
          .filter(
            (name) =>
              name in next &&
              JSON.stringify(next[name as keyof FinanceState]) !==
                JSON.stringify(current.current[name as keyof FinanceState]),
          )
          .map((name) => [name, next[name as keyof FinanceState]]),
      ),
    );
    if (publicRoute) {
      setCurrent(next);
      return;
    }
    if (!Object.keys(body).length) return;
    const saved = await api<Record<string, unknown>>("/preferences", {
      method: "PATCH",
      body,
    });
    setCurrent(stateSchema.parse({ ...current.current, ...saved }));
  }
  async function command<T = Record<string, unknown>>(
    payload: FinanceCommand,
  ): Promise<T> {
    const id = scope.current;
    if (!id) throw new Error("Create or select a workspace first.");
    if (offline)
      throw new Error(
        "Reconnect before saving. Your changes have not been sent.",
      );
    const fingerprint = JSON.stringify({ workspace: id, payload });
    const key = pending.current.get(fingerprint) ?? crypto.randomUUID();
    pending.current.set(fingerprint, key);
    const result = await api<T>(`/workspaces/${id}/commands`, {
      method: "POST",
      body: payload,
      key,
    });
    pending.current.delete(fingerprint);
    await loadWorkspace(id).catch((caught: unknown) =>
      setError(
        caught instanceof Error
          ? caught.message
          : "Saved. Reconnect to refresh your workspace.",
      ),
    );
    return result;
  }
  async function selectWorkspace(id: string) {
    await api("/preferences", {
      method: "PATCH",
      body: { activeWorkspaceId: id },
    });
    await loadWorkspace(id);
  }
  async function createWorkspace(name: string) {
    const fingerprint = JSON.stringify({ action: "workspace.create", name });
    const key = pending.current.get(fingerprint) ?? crypto.randomUUID();
    pending.current.set(fingerprint, key);
    const created = await api<{ id: string }>("/workspaces", {
      method: "POST",
      body: { name },
      key,
    });
    setMemberships(await api<WorkspaceMembership[]>("/workspaces"));
    await selectWorkspace(created.id);
    pending.current.delete(fingerprint);
    return created;
  }
  return (
    <FinanceContext.Provider
      value={{
        state,
        update,
        command,
        selectWorkspace,
        createWorkspace,
        refresh,
        workspace,
        memberships,
        role,
        notice: setMessage,
        ready,
        error,
        expired,
        offline,
      }}
    >
      {children}
      {message && (
        <div
          role="status"
          className="fixed bottom-24 left-4 right-4 z-[100] flex items-center justify-between gap-3 rounded-2xl bg-[#101416] px-5 py-4 text-sm text-white shadow-xl sm:left-auto sm:max-w-md lg:bottom-6"
        >
          {message}
          <button
            onClick={() => setMessage("")}
            aria-label="Dismiss notification"
            className="px-2 text-xl"
          >
            ×
          </button>
        </div>
      )}
    </FinanceContext.Provider>
  );
}
export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("FinanceProvider is missing");
  return context;
}
