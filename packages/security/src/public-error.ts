export const GENERIC_ACTION_ERROR = "Something went wrong";

/** Known domain errors may be shown; unexpected Error.message is production-hidden. */
export function publicActionError(
  error: unknown,
  isKnown: (value: unknown) => value is { message: string },
): string {
  if (isKnown(error)) return error.message;
  if (process.env.NODE_ENV !== "production" && error instanceof Error && error.message) {
    return error.message;
  }
  return GENERIC_ACTION_ERROR;
}
