import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { loadConfig } from "./config";
import { errorHandler, requestId, sendData } from "./http";
import { databaseReady } from "./db";
import { registerRoutes } from "./routes";
import { redisReady } from "./redis";

export function createApp() {
  const config = loadConfig();
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.TRUSTED_PROXY ? 1 : false);
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
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.body.password",
        "req.body.token",
        "req.body.secret",
      ],
    }),
  );
  app.use(requestId);
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
