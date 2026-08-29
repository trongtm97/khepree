export class PartnerError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PartnerError";
    this.code = code;
  }
}

export function isPartnerError(error: unknown): error is PartnerError {
  return error instanceof PartnerError;
}
