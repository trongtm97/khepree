import { createLogger, redact } from "./logger";

const log = createLogger("errors");

export interface ErrorReporterContext {
  requestId?: string;
  service?: string;
  [key: string]: unknown;
}

/** Vendor-neutral error reporting — apps depend on this, not Sentry directly. */
export interface ErrorReporter {
  captureException(error: unknown, context?: ErrorReporterContext): void;
  captureMessage(message: string, level?: "warning" | "error", context?: ErrorReporterContext): void;
}

export function noopErrorReporter(): ErrorReporter {
  return {
    captureException() {},
    captureMessage() {},
  };
}

/** Default reporter: structured JSON logs (no third-party SDK). */
export function loggingErrorReporter(): ErrorReporter {
  return {
    captureException(error, context) {
      log.error({
        event: "exception",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ...context,
      });
    },
    captureMessage(message, level = "error", context) {
      const fields = redact({ event: "message", message, ...context }) as Record<string, unknown>;
      if (level === "warning") log.warn(fields as { event: string });
      else log.error(fields as { event: string });
    },
  };
}

let reporter: ErrorReporter | null = null;

export function getErrorReporter(): ErrorReporter {
  if (reporter) return reporter;
  const dsn = process.env.SENTRY_DSN?.trim();
  if (dsn && !dsn.includes("CHANGE_ME")) {
    try {
      // Optional peer — install @sentry/node and set SENTRY_DSN to enable.
      // ponytail: dynamic require avoids hard dependency when Sentry is not used.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createSentryErrorReporter } = require("./sentry-error-reporter") as {
        createSentryErrorReporter: (dsn: string) => ErrorReporter;
      };
      reporter = createSentryErrorReporter(dsn);
      return reporter;
    } catch {
      reporter = loggingErrorReporter();
      log.warn({ event: "sentry_unavailable", msg: "SENTRY_DSN set but @sentry/node not installed" });
      return reporter;
    }
  }
  reporter = loggingErrorReporter();
  return reporter;
}

export function resetErrorReporterForTests(): void {
  reporter = null;
}
