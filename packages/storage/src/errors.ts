import { emitAlert } from "@khepree/config";

export class StorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageConfigurationError";
  }
}

export class StorageInfrastructureError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "StorageInfrastructureError";
    this.cause = cause;
    emitAlert("error", "r2_operation_failed", {
      error: message,
      cause: cause instanceof Error ? cause.message : String(cause),
    });
  }
}

/** Returns true only for expected missing-object errors from S3/R2. */
export function isObjectNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  const code = e.name ?? e.Code;
  if (code === "NoSuchKey" || code === "NotFound" || code === "404") return true;
  return e.$metadata?.httpStatusCode === 404;
}
