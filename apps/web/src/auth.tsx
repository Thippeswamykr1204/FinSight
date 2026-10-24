import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "./api";

export type User = {
  id: string;
  email: string;
  name: string;
  theme: "light" | "dark";
  activeWorkspaceId: string | null;
};
type AuthContext = {
  user: User | null;
  loading: boolean;
  error: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    password: string,
    privacyAccepted: boolean,
  ) => Promise<void>;
  signOut: () => Promise<SignOutResult>;
  signOutNotice: string;
  refresh: () => Promise<void>;
};
export type SignOutResult =
  | { ok: true }
  | { ok: false; message: string };
const Context = createContext<AuthContext | null>(null);
const LOCAL_SESSION_ENDED = "finsight:session-ended";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signOutNotice, setSignOutNotice] = useState("");
  const refresh = async () => {
    if (window.sessionStorage.getItem(LOCAL_SESSION_ENDED) === "1") {
      setUser(null);
      setError("");
      setLoading(false);
      return;
    }
    try {
      setUser(await api.get<User>("/auth/me"));
      setError("");
    } catch (caught) {
      if (!(caught instanceof ApiError) || caught.status !== 401)
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load your account.",
        );
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
    const onExpired = () => setUser(null);
    window.addEventListener("finsight:session-expired", onExpired);
    return () =>
      window.removeEventListener("finsight:session-expired", onExpired);
  }, []);
  const signIn = async (email: string, password: string) => {
    setError("");
    setSignOutNotice("");
    window.sessionStorage.removeItem(LOCAL_SESSION_ENDED);
    const result = await api.post<{ user: User }>("/auth/login", {
      email,
      password,
    });
    setUser({ ...result.user, theme: "light", activeWorkspaceId: null });
    await refresh();
  };
  const signUp = async (
    name: string,
    email: string,
    password: string,
    privacyAccepted: boolean,
  ) => {
    setError("");
    setSignOutNotice("");
    window.sessionStorage.removeItem(LOCAL_SESSION_ENDED);
    const result = await api.post<{ user: User }>("/auth/register", {
      name,
      email,
      password,
      privacyAccepted,
    });
    setUser({ ...result.user, theme: "light", activeWorkspaceId: null });
    await refresh();
  };
  const signOut = async (): Promise<SignOutResult> => {
    let message = "";
    try {
      await api.post("/auth/logout", {});
    } catch (caught) {
      message =
        caught instanceof Error
          ? `${caught.message} You have been signed out on this device.`
          : "The session could not be ended remotely. You have been signed out on this device.";
    } finally {
      window.dispatchEvent(new Event("finsight:session-ended"));
      window.sessionStorage.setItem(LOCAL_SESSION_ENDED, "1");
      setUser(null);
      setError("");
      setSignOutNotice(message);
    }
    return message
      ? { ok: false as const, message }
      : { ok: true as const };
  };
  return (
    <Context.Provider
      value={{
        user,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        signOutNotice,
        refresh,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useAuth() {
  const context = useContext(Context);
  if (!context) throw new Error("AuthProvider is missing");
  return context;
}

export function useSessionSignOut() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const run = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  return { signOut: run, busy };
}
