import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeftRight,
  BarChart3,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Gauge,
  Goal,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings2,
  Sun,
  WalletCards,
  X,
} from "lucide-react";
import { useAuth, useSessionSignOut, type User } from "../auth";
import { useFinance } from "../finance";
import { api } from "../api";
import { Button } from "./ui";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/budgets", label: "Budgets", icon: WalletCards },
  { to: "/goals", label: "Goals", icon: Goal },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/accounts", label: "Accounts", icon: CreditCard },
];

export function Brand() {
  return (
    <NavLink to="/dashboard" className="brand" aria-label="FinSight overview">
      <span className="brand-mark">
        <span />
      </span>
      <span>finsight</span>
    </NavLink>
  );
}

function ProfileMenu({
  menuId,
  user,
  role,
  workspaceName,
  onSignOut,
  signingOut,
}: {
  menuId: string;
  user: User | null;
  role: string | null;
  workspaceName: string | undefined;
  onSignOut: () => Promise<void>;
  signingOut: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>(
    [],
  );
  const initials = (user?.name ?? "Member")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const closeMenu = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus)
      window.requestAnimationFrame(() => triggerRef.current?.focus());
  };
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.parentElement?.contains(event.target as Node))
        closeMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
        return;
      event.preventDefault();
      const items = itemRefs.current.filter(
        (item): item is HTMLAnchorElement | HTMLButtonElement =>
          item !== null &&
          !(item instanceof HTMLButtonElement && item.disabled),
      );
      if (!items.length) return;
      const current = items.findIndex((item) => item === document.activeElement);
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : (current + (event.key === "ArrowUp" ? -1 : 1) + items.length) %
              items.length;
      items[next]?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    const frame = window.requestAnimationFrame(() =>
      itemRefs.current[0]?.focus(),
    );
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);
  return (
    <div className="profile-menu-wrap">
      <button
        ref={triggerRef}
        type="button"
        className="profile-button"
        aria-label="Open profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="avatar avatar-small">{initials}</span>
        <span>
          <b>{user?.name}</b>
          <small>{user?.email}</small>
        </span>
        <ChevronDown
          className="profile-chevron"
          size={15}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          className="profile-popover"
          role="menu"
          aria-label="Profile menu"
        >
          <div className="profile-summary" role="presentation">
            <span className="avatar avatar-small">{initials}</span>
            <span>
              <b>{user?.name}</b>
              <small>{user?.email}</small>
              <small>
                {role?.toLowerCase() ?? "member"}
                {workspaceName ? ` · ${workspaceName}` : ""}
              </small>
            </span>
          </div>
          <div className="profile-menu-divider" role="presentation" />
          <NavLink
            ref={(element) => {
              itemRefs.current[0] = element;
            }}
            role="menuitem"
            to="/settings"
            onClick={() => closeMenu(false)}
          >
            <Settings2 size={16} />
            Settings
          </NavLink>
          <button
            ref={(element) => {
              itemRefs.current[1] = element;
            }}
            type="button"
            role="menuitem"
            disabled={signingOut}
            onClick={() => {
              setOpen(false);
              void onSignOut();
            }}
          >
            <LogOut size={16} />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, refresh: refreshUser } = useAuth();
  const { signOut, busy: signingOut } = useSessionSignOut();
  const { memberships, workspace, role, selectWorkspace, notice, setNotice } =
    useFinance();
  const [mobile, setMobile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const theme = user?.theme ?? "light";
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    setMobile(false);
  }, [location.pathname]);
  const toggleTheme = async () => {
    await api.patch("/me", { theme: theme === "light" ? "dark" : "light" });
    await refreshUser();
  };
  const navigation = (instance: "sidebar" | "mobile") => (
    <>
      <Brand />
      <div className="workspace-switcher">
        <span className="avatar">{user?.name.slice(0, 1).toUpperCase()}</span>
        <div className="workspace-select-wrap">
          <select
            aria-label="Current workspace"
            value={workspace?.id ?? ""}
            onChange={(event) => void selectWorkspace(event.target.value)}
          >
            <option value="" disabled>
              {workspace ? workspace.name : "Choose workspace"}
            </option>
            {memberships.map((entry) => (
              <option key={entry.workspace.id} value={entry.workspace.id}>
                {entry.workspace.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </div>
      </div>
      <p className="nav-label">Your money</p>
      <nav className="primary-nav" aria-label="Primary navigation">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }: { isActive: boolean }) =>
              isActive ? "active" : ""
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <NavLink to="/settings">
          <Settings2 size={18} />
          Settings
        </NavLink>
        <div className="sidebar-note">
          <Gauge size={17} />
          <span>
            Facts first.
            <br />
            <small>Decisions follow.</small>
          </span>
        </div>
        <ProfileMenu
          menuId={`profile-menu-${instance}`}
          user={user}
          role={role}
          workspaceName={workspace?.name}
          onSignOut={signOut}
          signingOut={signingOut}
        />
      </div>
    </>
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">{navigation("sidebar")}</aside>
      <div className="app-main">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu size={20} />
          </button>
          <div>
            <p className="topbar-kicker">Private workspace</p>
            <p className="topbar-title">
              {location.pathname === "/dashboard"
                ? `Welcome back, ${user?.name.split(" ")[0]}`
                : (nav.find((item) => item.to === location.pathname)?.label ??
                  "Your workspace")}
            </p>
          </div>
          <div className="topbar-actions">
            <button
              className="theme-button"
              aria-label={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
              onClick={() => void toggleTheme()}
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <Button onClick={() => navigate("/transactions?new=1")}>
              <CircleDollarSign size={16} />
              Add money move
            </Button>
          </div>
        </header>
        <main id="main-content" className="content">
          {children}
        </main>
        {notice && (
          <div role="status" className="toast">
            {notice}
            <button
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        )}
      </div>
      {mobile && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setMobile(false)}
        >
          <aside
            className="mobile-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-top">
              <Brand />
              <button
                className="icon-button"
                onClick={() => setMobile(false)}
                aria-label="Close navigation"
              >
                <X size={20} />
              </button>
            </div>
            {navigation("mobile")}
          </aside>
        </div>
      )}
    </div>
  );
}
