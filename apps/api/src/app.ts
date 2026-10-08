import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { loadConfig } from "./config";
import { errorHandler, HttpError, requestId, sendData } from "./http";
import { databaseReady } from "./db";
import { registerRoutes } from "./routes";
import { redisReady } from "./redis";
import { processBillingWebhook } from "./billing";

export function createApp() {
  const config = loadConfig();
  const app = express();
  app.disable("x-powered-by");
  app.set(
    "trust proxy",
    config.TRUSTED_PROXY
      ? config.TRUSTED_PROXY.split(",").map((value) => value.trim())
      : false,
  );
  app.use((request, _response, next) => {
    // Only Express's explicitly trusted proxy chain may supply the client IP.
    delete request.headers["x-finsight-client-ip"];
    request.headers["x-finsight-client-ip"] =
      request.ip ?? request.socket.remoteAddress ?? "127.0.0.1";
    next();
  });
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: config.WEB_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }),
  );
  app.use(
    pinoHttp({
      serializers: {
        req: (request) => ({
          id: request.id,
          method: request.method,
          url: String(request.url ?? "")
            .split("?")[0]
            .replace(
              /(\/reports\/shared\/|\/reset-password\/)[^/]+$/,
              "$1[redacted]",
            ),
          remoteAddress: request.remoteAddress,
        }),
        res: (response) => ({ statusCode: response.statusCode }),
      },
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.body.password",
        "req.body.token",
        "req.body.secret",
        "req.query.token",
        'res.headers["set-cookie"]',
      ],
    }),
  );
  app.use(requestId);
  app.post(
    "/api/v1/billing/webhook",
    express.raw({ type: "application/json", limit: "256kb" }),
    async (request, response, next) => {
      try {
        if (!Buffer.isBuffer(request.body))
          throw new HttpError(
            415,
            "WEBHOOK_CONTENT_TYPE",
            "Webhook requires an application/json raw body.",
          );
        sendData(
          response,
          await processBillingWebhook(
            request.body,
            request.header("x-razorpay-signature"),
            request.header("x-razorpay-event-id"),
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );
  app.get("/api/v1/capabilities", (_request, response) =>
    sendData(response, {
      google: Boolean(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET),
      billing: Boolean(config.RAZORPAY_KEY_ID),
      billingTestMode: Boolean(config.RAZORPAY_KEY_ID?.startsWith("rzp_test_")),
    }),
  );
  app.use(express.json({ limit: "2mb", strict: true }));

  app.get("/health", (_request, response) =>
    sendData(response, { status: "ok", service: "finsight-api" }),
  );
  app.get("/ready", async (_request, response) => {
    const [database, cache] = await Promise.all([
      Promise.resolve(databaseReady()),
      redisReady(),
    ]);
    const ready = database && cache;
    return sendData(
      response,
      { status: ready ? "ready" : "unavailable" },
      ready ? 200 : 503,
    );
  });
  registerRoutes(app);
  app.get("/api/v1", (_request, response) =>
    sendData(response, { name: "FinSight API", version: "v1" }),
  );
  app.use(errorHandler);
  return app;
}
