import type { ErrorReporter } from "./error-reporter";
import { loggingErrorReporter } from "./error-reporter";

/** Optional Sentry adapter — requires `@sentry/node` installed in the deployment image. */
export function createSentryErrorReporter(dsn: string): ErrorReporter {
  try {
    // ponytail: eval('require') keeps optional @sentry/node off the webpack module graph.
    const req = eval("require") as NodeRequire;
    const Sentry = req("@sentry/node") as {
      init: (options: { dsn: string; environment?: string }) => void;
      captureException: (error: unknown, context?: { extra?: Record<string, unknown> }) => void;
      captureMessage: (message: string, level?: "warning" | "error") => void;
    };
    Sentry.init({ dsn, environment: process.env.NODE_ENV });
    const fallback = loggingErrorReporter();
    return {
      captureException(error, context) {
        fallback.captureException(error, context);
        Sentry.captureException(error, { extra: context });
      },
      captureMessage(message, level = "error", context) {
        fallback.captureMessage(message, level, context);
        Sentry.captureMessage(message, level);
      },
    };
  } catch {
    return loggingErrorReporter();
  }
}
