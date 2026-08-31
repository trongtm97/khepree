export class LicensingError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "LicensingError";
    this.code = code;
    this.details = details;
  }
}

export function isLicensingError(error: unknown): error is LicensingError {
  return error instanceof LicensingError;
}
