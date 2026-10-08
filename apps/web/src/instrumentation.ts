export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    const { validateEnvironment } = await import("./lib/hosted/config");
    validateEnvironment();
    if (process.env.SENTRY_DSN) {
      const Sentry = await import("@sentry/nextjs");
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        release: process.env.SENTRY_RELEASE,
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
            exception.value = "Web rendering failed.";
          return event;
        },
      });
    }
  }
}

export async function onRequestError(error: unknown) {
  if (!process.env.SENTRY_DSN || process.env.NEXT_RUNTIME !== "nodejs") return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureException(error, { tags: { service: "web" } });
}
