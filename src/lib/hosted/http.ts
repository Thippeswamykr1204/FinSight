import { randomUUID } from "node:crypto";
import { ZodError, type ZodType } from "zod";
import { Prisma } from "@/generated/hosted";
import { hostedConfig, isHostedEnabled } from "./config";
import { consumeLimit } from "./rate-limit";
import { hostedAuth } from "./auth";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export type Principal = {
  userId: string;
  email: string;
  name: string;
  sessionId: string;
  fresh: boolean;
};
export async function principal(headers: Headers): Promise<Principal> {
  if (!isHostedEnabled())
    throw new HttpError(
      503,
      "HOSTED_DISABLED",
      "Hosted workspaces are not configured on this deployment.",
    );
  const session = await hostedAuth().api.getSession({ headers });
  if (!session)
    throw new HttpError(
      401,
      "UNAUTHENTICATED",
      "Sign in to access your workspace.",
    );
  if (!session.user.emailVerified)
    throw new HttpError(
      403,
      "EMAIL_UNVERIFIED",
      "Verify your email before continuing.",
    );
  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    sessionId: session.session.id,
    fresh:
      Date.now() - new Date(session.session.createdAt).getTime() <
      10 * 60 * 1000,
  };
}
export function assertOrigin(request: Request) {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    request.headers.get("origin") !== hostedConfig().origin
  )
    throw new HttpError(
      403,
      "ORIGIN_REJECTED",
      "A same-origin request is required.",
    );
}
export function json(value: unknown, status = 200, requestId = randomUUID()) {
  return new Response(
    JSON.stringify(value, (_key, field) => {
      if (typeof field === "bigint") {
        const number = Number(field);
        if (!Number.isSafeInteger(number))
          throw new HttpError(
            422,
            "AMOUNT_RANGE",
            "An amount exceeds the supported range.",
          );
        return number;
      }
      return field;
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Request-Id": requestId,
      },
    },
  );
}
export async function readTextBody(request: Request, maxBytes = 2_000_000) {
  if (Number(request.headers.get("content-length") || 0) > maxBytes)
    throw new HttpError(413, "BODY_LIMIT", "Request exceeds the size limit.");
  const reader = request.body?.getReader();
  if (!reader)
    throw new HttpError(400, "EMPTY_BODY", "A request body is required.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "BODY_LIMIT", "Request exceeds the size limit.");
    }
    chunks.push(part.value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
export async function body<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "CONTENT_TYPE", "Use application/json.");
  const text = await readTextBody(request);
  try {
    return schema.parse(JSON.parse(text));
  } catch (error) {
    if (error instanceof ZodError) throw error;
    throw new HttpError(400, "INVALID_JSON", "The request is not valid JSON.");
  }
}
export async function endpoint(
  request: Request,
  operation: (actor: Principal, requestId: string) => Promise<unknown>,
  status = 200,
) {
  const requestId = randomUUID();
  const start = Date.now();
  try {
    if (!isHostedEnabled())
      throw new HttpError(
        503,
        "HOSTED_DISABLED",
        "Hosted workspaces are not configured on this deployment.",
      );
    assertOrigin(request);
    const actor = await principal(request.headers);
    const rate = await consumeLimit(`api:${actor.userId}`, {
      window: 60,
      max: 120,
    });
    if (!rate.allowed)
      return new Response(
        JSON.stringify({
          error: {
            code: "RATE_LIMIT",
            message: "Too many requests. Try again shortly.",
            requestId,
          },
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rate.retryAfter),
            "Cache-Control": "no-store",
            "X-Request-Id": requestId,
          },
        },
      );
    const data = await operation(actor, requestId);
    console.info(
      JSON.stringify({
        event: "api_request",
        requestId,
        method: request.method,
        status,
        durationMs: Date.now() - start,
      }),
    );
    return json({ data, requestId }, status, requestId);
  } catch (error) {
    let failure: HttpError;
    if (error instanceof HttpError) failure = error;
    else if (error instanceof ZodError)
      failure = new HttpError(
        422,
        "VALIDATION",
        error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      );
    else if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      failure = new HttpError(409, "CONFLICT", "This record already exists.");
    else if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    )
      failure = new HttpError(
        409,
        "RELATED_RECORD",
        "This operation conflicts with related records.",
      );
    else
      failure = new HttpError(
        503,
        "SERVICE_UNAVAILABLE",
        "The workspace is temporarily unavailable. Please retry.",
      );
    console.info(
      JSON.stringify({
        event: "api_request",
        requestId,
        method: request.method,
        status: failure.status,
        code: failure.code,
        durationMs: Date.now() - start,
      }),
    );
    return json(
      { error: { code: failure.code, message: failure.message, requestId } },
      failure.status,
      requestId,
    );
  }
}
