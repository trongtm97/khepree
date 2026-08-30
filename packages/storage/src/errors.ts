import { emitAlert } from "@khepree/config";

export class StorageConfigurationError extends Error {
  readonly cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "StorageConfigurationError";
    this.cause = options?.cause;
  }
}

export class StorageInfrastructureError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "StorageInfrastructureError";
    this.cause = cause;
    emitAlert("error", "s3_operation_failed", {
      error: message,
      cause: cause instanceof Error ? cause.message : String(cause),
    });
  }
}

/** Returns true only for expected missing-object errors from S3-compatible APIs. */
export function isObjectNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  const code = e.name ?? e.Code;
  if (code === "NoSuchKey" || code === "NotFound" || code === "404") return true;
  return e.$metadata?.httpStatusCode === 404;
}
