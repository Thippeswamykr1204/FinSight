import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { loadConfig } from "./config.js";
import { databaseReady } from "./db.js";
import { errorHandler, HttpError, requestId, sendData } from "./http.js";
import { ensureCsrfCookie } from "./security.js";
import { requireCsrf, rateLimit } from "./middleware.js";
import { registerRoutes } from "./routes.js";

export function createApp() {
  const config = loadConfig();
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.TRUST_PROXY === "true");
  app.use(
    helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }),
  );
  app.use(
    cors({
      origin: config.WEB_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Idempotency-Key",
        "X-CSRF-Token",
        "X-Request-Id",
      ],
    }),
  );
  app.use(requestId);
  app.use((request, response, next) => {
    const started = Date.now();
    response.once("finish", () =>
      console.log(
        JSON.stringify({
          level: "info",
          requestId: response.getHeader("X-Request-Id"),
          method: request.method,
          path: request.path,
          status: response.statusCode,
          durationMs: Date.now() - started,
        }),
      ),
    );
    next();
  });
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb", strict: true }));
  app.use((request, response, next) => {
    ensureCsrfCookie(request, response);
    next();
  });
  app.use(requireCsrf);
  app.get("/health", (_request, response) =>
    sendData(response, { status: "ok", service: "finsight-api" }),
  );
  app.get("/ready", (_request, response) =>
    sendData(
      response,
      { status: databaseReady() ? "ready" : "unavailable" },
      databaseReady() ? 200 : 503,
    ),
  );
  app.use(
    "/api/auth",
    rateLimit(30, 60, (request) => `auth:${request.ip ?? "unknown"}`),
  );
  app.use(
    "/api",
    rateLimit(180, 60, (request) => `api:${request.ip ?? "unknown"}`),
  );
  registerRoutes(app);
  app.use((_request, _response, next) =>
    next(new HttpError(404, "NOT_FOUND", "Route not found.")),
  );
  app.use(errorHandler);
  return app;
}
