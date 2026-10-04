import { endpoint } from "@/lib/hosted/http";
import { overview } from "@/lib/hosted/repository";
export const dynamic = "force-dynamic";
export function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async (actor) => overview(actor, (await params).id));
}
