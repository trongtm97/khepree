import type { GlobalRole } from "@khepree/types";

const STAFF_ROLES = new Set<GlobalRole>(["SUPPORT", "FINANCE", "ADMIN", "SUPER_ADMIN"]);

export function isStaffRole(role: GlobalRole): boolean {
  return STAFF_ROLES.has(role);
}

/** ADMIN cannot create or mutate SUPER_ADMIN. SUPER_ADMIN can assign any staff/user role. */
export function canAssignGlobalRole(
  actor: GlobalRole,
  targetCurrent: GlobalRole,
  next: GlobalRole,
): boolean {
  if (actor === "SUPER_ADMIN") return true;
  if (actor !== "ADMIN") return false;
  if (targetCurrent === "SUPER_ADMIN" || next === "SUPER_ADMIN") return false;
  return true;
}

export function parseAdminReason(value: unknown, minLength = 3): string | null {
  const reason = String(value ?? "").trim();
  return reason.length >= minLength ? reason : null;
}

/** Production: ADMIN and SUPER_ADMIN must have MFA on before using admin. */
export function adminMfaRequired(input: {
  globalRole: GlobalRole;
  twoFactorEnabled: boolean;
  production?: boolean;
}): boolean {
  const production = input.production ?? process.env.NODE_ENV === "production";
  if (!production) return false;
  if (input.globalRole !== "ADMIN" && input.globalRole !== "SUPER_ADMIN") return false;
  return !input.twoFactorEnabled;
}
