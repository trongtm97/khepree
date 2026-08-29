import { z } from "zod";

export const principalTypeSchema = z.enum(["USER", "ORGANIZATION"]);
export type PrincipalType = z.infer<typeof principalTypeSchema>;

export const entitlementStatusSchema = z.enum([
  "active",
  "expired",
  "revoked",
  "suspended",
]);
export type EntitlementStatus = z.infer<typeof entitlementStatusSchema>;

export const entitlementSourceSchema = z.enum([
  "trial",
  "subscription",
  "perpetual",
  "complimentary",
  "reseller",
  "admin_grant",
]);
export type EntitlementSource = z.infer<typeof entitlementSourceSchema>;

export function isEntitlementActive(input: {
  status: EntitlementStatus;
  startsAt: Date;
  expiresAt: Date | null;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  if (input.status !== "active") return false;
  if (input.startsAt > now) return false;
  if (input.expiresAt && input.expiresAt <= now) return false;
  return true;
}

export function resolvePrincipalId(
  principalType: PrincipalType,
  userId: string | null | undefined,
  organizationId: string | null | undefined,
): string {
  if (principalType === "USER") {
    if (!userId) throw new Error("USER principal requires userId");
    return userId;
  }
  if (!organizationId) throw new Error("ORGANIZATION principal requires organizationId");
  return organizationId;
}
