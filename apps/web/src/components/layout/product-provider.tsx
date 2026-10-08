"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { FinanceProvider } from "@/components/finance/provider";
import { AppShell } from "./app-shell";

export function ProductProvider({ children }: { children: ReactNode }) {
  const path = usePathname();
  const hosted =
    path === "/app" ||
    path.startsWith("/app/") ||
    path.startsWith("/auth/") ||
    path === "/sign-in" ||
    path === "/sign-up";
  return hosted ? (
    <>{children}</>
  ) : (
    <FinanceProvider>
      <AppShell>{children}</AppShell>
    </FinanceProvider>
  );
}
