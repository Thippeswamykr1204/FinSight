import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function sendData(response: Response, data: unknown, status = 200) {
  response.status(status).json({ data });
}

export function requestId(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const id = request.header("x-request-id")?.slice(0, 80) || randomUUID();
  response.setHeader("X-Request-Id", id);
  response.locals.requestId = id;
  next();
}

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction,
) {
  const requestIdValue = String(
    response.getHeader("X-Request-Id") ?? "unknown",
  );
  if (error instanceof HttpError)
    return response.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        requestId: requestIdValue,
      },
    });
  if (error instanceof ZodError)
    return response.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Check the highlighted fields.",
        fields: error.flatten().fieldErrors,
        requestId: requestIdValue,
      },
    });
  if ((error as { code?: number }).code === 11000)
    return response.status(409).json({
      error: {
        code: "CONFLICT",
        message: "That record already exists.",
        requestId: requestIdValue,
      },
    });
  console.error(
    JSON.stringify({
      level: "error",
      requestId: requestIdValue,
      path: request.path,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  return response.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Try again shortly.",
      requestId: requestIdValue,
    },
  });
}
