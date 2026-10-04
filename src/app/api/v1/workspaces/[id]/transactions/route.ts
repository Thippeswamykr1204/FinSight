import { endpoint } from "@/lib/hosted/http";
import { entries } from "@/lib/hosted/repository";
export const dynamic = "force-dynamic";
export function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async (actor) =>
    entries(actor, (await params).id, new URL(request.url).searchParams),
  );
}
