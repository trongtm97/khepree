import { createDrizzleAuditService, requireDb } from "@khepree/db";

export type AuthAuditAction =
  | "auth.sign_in"
  | "auth.sign_out"
  | "auth.password_change"
  | "auth.password_reset_request"
  | "auth.profile_update"
  | "auth.session_revoke"
  | "auth.two_factor_enable"
  | "auth.two_factor_disable";

export async function recordAuthAudit(input: {
  actorUserId?: string | null;
  action: AuthAuditAction;
  resourceType?: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    const db = requireDb();
    const audit = createDrizzleAuditService(db);
    await audit.record({
      actorUserId: input.actorUserId,
      action: input.action,
      resourceType: input.resourceType ?? "auth",
      resourceId: input.resourceId ?? null,
      metadata: input.metadata ?? null,
      ipAddress: input.ipAddress ?? null,
    });
  } catch {
    // ponytail: audit failure must not block auth — log and continue
    console.warn("[khepree:auth:audit] Failed to record audit event:", input.action);
  }
}
