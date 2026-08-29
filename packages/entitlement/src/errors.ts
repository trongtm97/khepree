export class EntitlementError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "EntitlementError";
    this.code = code;
  }
}

export function isEntitlementError(error: unknown): error is EntitlementError {
  return error instanceof EntitlementError;
}
