export class LicensingError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "LicensingError";
    this.code = code;
  }
}

export function isLicensingError(error: unknown): error is LicensingError {
  return error instanceof LicensingError;
}
