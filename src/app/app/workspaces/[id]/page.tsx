import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { principal, HttpError } from "@/lib/hosted/http";
import { authorize } from "@/lib/hosted/authorization";
import { WorkspaceBoard } from "@/components/hosted/workspace-board";
export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await principal(await headers());
  try {
    await authorize(actor, id);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
  return <WorkspaceBoard workspaceId={id} />;
}
