export type AccessTermType = "TRIAL" | "FIXED_TERM" | "PERPETUAL";

export function accessTermType(accessTermDays: number | null | undefined, source?: string): AccessTermType {
  if (source === "trial") return "TRIAL";
  if (accessTermDays == null) return "PERPETUAL";
  return "FIXED_TERM";
}

export function requiresLicense(
  licensingMode: "NONE" | "ACCOUNT" | "DEVICE_LEASE" | "LICENSE_KEY_DEVICE",
): boolean {
  return licensingMode === "DEVICE_LEASE" || licensingMode === "LICENSE_KEY_DEVICE";
}

/**
 * If an active entitlement still expires in the future, extend from that instant.
 * If expired or missing, start from `now` (confirmed payment time).
 */
export function nextExpiresAt(input: {
  accessTermDays: number | null | undefined;
  now: Date;
  existingExpiresAt?: Date | null;
  existingStatus?: string;
}): Date | null {
  if (input.accessTermDays == null) return null;
  const ms = input.accessTermDays * 86_400_000;
  const existing = input.existingExpiresAt;
  const activeFuture =
    input.existingStatus === "active" && existing && existing.getTime() > input.now.getTime();
  const base = activeFuture && existing ? existing : input.now;
  return new Date(base.getTime() + ms);
}
