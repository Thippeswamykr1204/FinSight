import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { serverMe, ServerApiError } from "@/lib/hosted/server-api";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await serverMe();
  } catch (error) {
    if (error instanceof ServerApiError && [401, 403].includes(error.status))
      redirect("/sign-in");
    throw error;
  }
  return children;
}
