import { endpoint, body, HttpError } from "@/lib/hosted/http";
import { executeCommand } from "@/lib/hosted/repository";
import { commandSchema } from "@/lib/hosted/contracts";
export function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async (actor, requestId) => {
    const key = request.headers.get("idempotency-key");
    if (!key || !/^[a-zA-Z0-9_-]{8,128}$/.test(key))
      throw new HttpError(
        400,
        "IDEMPOTENCY_REQUIRED",
        "Supply an Idempotency-Key containing 8–128 letters, digits, hyphens or underscores.",
      );
    return executeCommand(
      actor,
      (await params).id,
      key,
      await body(request, commandSchema),
      requestId,
    );
  });
}
