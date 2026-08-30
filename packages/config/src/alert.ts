import { createLogger, type LogFields, type LogLevel } from "./logger";

const alertLogger = createLogger("alerts");

/** Structured alert log for external monitoring (filter on event prefix `alert.`). */
export function emitAlert(
  level: Extract<LogLevel, "warn" | "error">,
  event: string,
  fields: Omit<LogFields, "event"> = {},
): void {
  const name = event.startsWith("alert.") ? event : `alert.${event}`;
  alertLogger[level]({ ...fields, event: name });
}
