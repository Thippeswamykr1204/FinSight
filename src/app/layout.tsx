import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "FinSight – Personal Finance Tracker",
  description: "Track your expenses, set budgets, and gain financial insights",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get("x-pathname") || "";
  const showAppShell = !pathname.startsWith("/login");

  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-slate-950 text-slate-100 antialiased`}>
        <ToastProvider>
          {showAppShell ? (
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <div className="flex flex-1 flex-col overflow-hidden ml-60">
                <Header />
                <main className="flex-1 overflow-y-auto p-6">
                  {children}
                </main>
              </div>
            </div>
          ) : (
            children
          )}
        </ToastProvider>
      </body>
    </html>
  );
}
