export class DesktopAuthError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DesktopAuthError";
    this.code = code;
  }
}

export function isDesktopAuthError(error: unknown): error is DesktopAuthError {
  return error instanceof DesktopAuthError;
}
