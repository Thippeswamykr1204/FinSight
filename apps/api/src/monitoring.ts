import * as Sentry from "@sentry/node";
import { loadConfig } from "./config";
import { HttpError } from "./http";
let enabled = false;

export function startMonitoring() {
  const config = loadConfig();
  if (!config.SENTRY_DSN) return;
  Sentry.init({
    dsn: config.SENTRY_DSN,
    release: config.SENTRY_RELEASE,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      frameContextLines: 0,
    },
    includeServerName: false,
    tracePropagationTargets: [],
    defaultIntegrations: false,
    beforeSend(event) {
      event.request = undefined;
      event.user = undefined;
      event.extra = undefined;
      event.breadcrumbs = undefined;
      for (const exception of event.exception?.values ?? [])
        exception.value =
          "Server operation failed. See the local request reference.";
      return event;
    },
  });
  enabled = true;
}
export function captureFailure(error: unknown) {
  if (!enabled) return;
  Sentry.captureException(error, {
    tags: {
      service: "api",
      code: error instanceof HttpError ? error.code : "INTERNAL_ERROR",
    },
  });
}
export const flushMonitoring = () => Sentry.flush(2_000);
