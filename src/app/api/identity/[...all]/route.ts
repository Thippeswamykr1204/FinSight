import { after } from "next/server";
import { hostedAuth } from "@/lib/hosted/auth";
import { deliverEmailBatch } from "@/lib/hosted/email";
import { isHostedEnabled } from "@/lib/hosted/config";
import { HttpError, readTextBody } from "@/lib/hosted/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(request: Request) {
  if (!isHostedEnabled())
    return Response.json(
      {
        error: {
          code: "HOSTED_DISABLED",
          message: "Hosted sign-in is not configured on this deployment.",
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  try {
    const body = request.body ? await readTextBody(request, 64_000) : undefined;
    const headers = new Headers(request.headers);
    // Trust a proxy header only when explicitly configured and sanitized at ingress.
    headers.set(
      "x-finsight-client-ip",
      process.env.TRUSTED_IP_HEADER
        ? request.headers.get(process.env.TRUSTED_IP_HEADER) || "127.0.0.1"
        : "127.0.0.1",
    );
    const response = await hostedAuth().handler(
      new Request(request, {
        headers,
        ...(body !== undefined ? { body } : {}),
      }),
    );
    after(async () => {
      try {
        await deliverEmailBatch(5);
      } catch {
        console.error(JSON.stringify({ event: "email_worker_unavailable" }));
      }
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof HttpError)
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    return Response.json(
      {
        error: {
          code: "AUTH_UNAVAILABLE",
          message: "Sign-in is temporarily unavailable. Try again shortly.",
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export const GET = handle;
export const POST = handle;
