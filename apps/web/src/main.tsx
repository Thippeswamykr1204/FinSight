import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { FinanceProvider } from "./finance";
import { AppShell } from "./components/AppShell";
import "./styles.css";

const Landing = lazy(() => import("./pages/Landing"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Budgets = lazy(() => import("./pages/Budgets"));
const Goals = lazy(() => import("./pages/Goals"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Insights = lazy(() => import("./pages/Insights"));
const Settings = lazy(() => import("./pages/Settings"));
const Privacy = lazy(() => import("./pages/Privacy"));

function Protected() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="boot-screen">
        <div className="brand">
          <span className="brand-mark">
            <span />
          </span>
          <span>finsight</span>
        </div>
        <div className="loading-bar" />
      </div>
    );
  return user ? (
    <FinanceProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </FinanceProvider>
  ) : (
    <Navigate to="/login" replace />
  );
}

function PublicOnly({ mode }: { mode: "login" | "register" }) {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : <AuthPage mode={mode} />;
}

function App() {
  return (
    <Suspense
      fallback={
        <div className="boot-screen">
          <div className="loading-bar" />
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/login" element={<PublicOnly mode="login" />} />
        <Route path="/register" element={<PublicOnly mode="register" />} />
        <Route element={<Protected />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

if ("serviceWorker" in navigator)
  window.addEventListener(
    "load",
    () => void navigator.serviceWorker.register("/sw.js"),
  );
