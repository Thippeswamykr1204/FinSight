import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export type ApiErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMIT"
  | "SERVICE_UNAVAILABLE";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function requestId(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const id =
    request.header("x-request-id")?.match(/^[a-zA-Z0-9_-]{8,128}$/)?.[0] ??
    randomUUID();
  response.setHeader("X-Request-Id", id);
  Object.defineProperty(request, "requestId", { value: id, enumerable: false });
  next();
}

export function sendData(response: Response, data: unknown, status = 200) {
  response.setHeader("Cache-Control", "no-store");
  return response
    .status(status)
    .json({ data, requestId: response.getHeader("X-Request-Id") });
}

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction,
) {
  const requestId = response.getHeader("X-Request-Id");
  const status = (error as { status?: number })?.status;
  const failure =
    error instanceof HttpError
      ? error
      : error instanceof ZodError
        ? new HttpError(
            422,
            "VALIDATION",
            "Request validation failed.",
            error.flatten(),
          )
        : status === 413
          ? new HttpError(413, "BODY_LIMIT", "Request exceeds the size limit.")
          : status === 400
            ? new HttpError(
                400,
                "INVALID_JSON",
                "The request is not valid JSON.",
              )
            : (error as { code?: number })?.code === 11000
              ? new HttpError(409, "CONFLICT", "This record already exists.")
              : new HttpError(
                  503,
                  "SERVICE_UNAVAILABLE",
                  "The service is temporarily unavailable.",
                );
  if (failure.status >= 500)
    request.log?.error({ err: error, requestId }, "request_failed");
  response.setHeader("Cache-Control", "no-store");
  response.status(failure.status).json({
    error: {
      code: failure.code,
      message: failure.message,
      ...(failure.details ? { details: failure.details } : {}),
      requestId,
    },
  });
}
