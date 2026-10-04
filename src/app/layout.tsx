import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/geist";
import "@fontsource-variable/fraunces";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { FinanceProvider } from "@/components/finance/provider";
import { PwaRegistration } from "@/components/layout/pwa-registration";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  title: {
    default: "FinSight — Money, with perspective.",
    template: "%s · FinSight",
  },
  description:
    "A calmer way to understand your money, plan what is next, and build financial momentum.",
  applicationName: "FinSight",
  keywords: [
    "personal finance",
    "budgeting",
    "cash flow",
    "financial planning",
  ],
  authors: [{ name: "FinSight" }],
  creator: "FinSight",
  openGraph: {
    type: "website",
    siteName: "FinSight",
    title: "FinSight — Money, with perspective.",
    description: "See what changed. Know what is safe. Plan what is next.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinSight — Money, with perspective.",
    description: "A calmer financial operating system.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f5f7f6",
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body className="font-sans antialiased">
        <PwaRegistration />
        <FinanceProvider>
          <AppShell>{children}</AppShell>
        </FinanceProvider>
      </body>
    </html>
  );
}
