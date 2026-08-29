const SENSITIVE_KEY =
  /^(password|passwd|authorization|cookie|cookies|secret|token|access_token|refresh_token|id_token|api[_-]?key|private[_-]?key|license[_-]?key|credit[_-]?card|cardnumber|cvv|cvc|pan)$/i;

const REDACTED = "[REDACTED]";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  event: string;
  requestId?: string;
  [key: string]: unknown;
}

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY.test(key)) return REDACTED;
  return redact(value);
}

export function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = redactValue(key, nested);
    }
    return out;
  }
  return value;
}

export function createLogger(service: string) {
  function write(level: LogLevel, fields: LogFields, message?: string): void {
    if (level === "debug" && process.env.NODE_ENV === "production") return;
    const line = redact({
      ts: new Date().toISOString(),
      level,
      service,
      msg: message ?? fields.event,
      ...fields,
    });
    const encoded = JSON.stringify(line);
    if (level === "error") console.error(encoded);
    else if (level === "warn") console.warn(encoded);
    else console.info(encoded);
  }

  return {
    debug: (fields: LogFields, message?: string) => write("debug", fields, message),
    info: (fields: LogFields, message?: string) => write("info", fields, message),
    warn: (fields: LogFields, message?: string) => write("warn", fields, message),
    error: (fields: LogFields, message?: string) => write("error", fields, message),
  };
}
