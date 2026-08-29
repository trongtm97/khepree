import { and, eq } from "drizzle-orm";
import {
  createDrizzleAuditService,
  requireDb,
  session as sessionTable,
  user,
  userProfiles,
  type AuditService,
  type Database,
} from "@khepree/db";
import { canAssignGlobalRole, parseAdminReason } from "@khepree/security";
import type { GlobalRole } from "@khepree/types";
import { GLOBAL_ROLES } from "@khepree/types";

export class IdentityError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "IdentityError";
    this.code = code;
  }
}

export function isIdentityError(error: unknown): error is IdentityError {
  return error instanceof IdentityError;
}

function isGlobalRole(value: string): value is GlobalRole {
  return (GLOBAL_ROLES as readonly string[]).includes(value);
}

export class IdentityDirectory {
  constructor(
    private readonly db: Database = requireDb(),
    private readonly audit: AuditService = createDrizzleAuditService(requireDb()),
  ) {}

  async setGlobalRole(input: {
    actorUserId: string;
    actorRole: GlobalRole;
    targetUserId: string;
    nextRole: string;
    reason: string;
  }): Promise<GlobalRole> {
    const reason = parseAdminReason(input.reason);
    if (!reason) throw new IdentityError("INVALID_INPUT", "Reason is required");
    if (input.actorUserId === input.targetUserId) {
      throw new IdentityError("FORBIDDEN", "You cannot change your own role");
    }
    if (!isGlobalRole(input.nextRole)) {
      throw new IdentityError("INVALID_INPUT", "Unknown role");
    }
    const current = await this.requireProfile(input.targetUserId);
    if (!canAssignGlobalRole(input.actorRole, current.globalRole, input.nextRole)) {
      throw new IdentityError("FORBIDDEN", "You cannot assign that role");
    }
    await this.db
      .update(userProfiles)
      .set({ globalRole: input.nextRole, updatedAt: new Date() })
      .where(eq(userProfiles.userId, input.targetUserId));
    await this.audit.record({
      actorUserId: input.actorUserId,
      action: "admin.user.role",
      resourceType: "user",
      resourceId: input.targetUserId,
      metadata: { from: current.globalRole, to: input.nextRole, reason },
    });
    return input.nextRole;
  }

  async setSuspended(input: {
    actorUserId: string;
    targetUserId: string;
    suspended: boolean;
    reason: string;
  }): Promise<void> {
    const reason = parseAdminReason(input.reason);
    if (!reason) throw new IdentityError("INVALID_INPUT", "Reason is required");
    if (input.actorUserId === input.targetUserId) {
      throw new IdentityError("FORBIDDEN", "You cannot suspend yourself");
    }
    const [exists] = await this.db.select({ id: user.id }).from(user).where(eq(user.id, input.targetUserId)).limit(1);
    if (!exists) throw new IdentityError("NOT_FOUND", "User not found");
    await this.requireProfile(input.targetUserId);
    await this.db
      .update(userProfiles)
      .set({
        suspendedAt: input.suspended ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, input.targetUserId));
    await this.audit.record({
      actorUserId: input.actorUserId,
      action: input.suspended ? "admin.user.suspend" : "admin.user.unsuspend",
      resourceType: "user",
      resourceId: input.targetUserId,
      metadata: { reason },
    });
  }

  async revokeSession(input: {
    actorUserId: string;
    targetUserId: string;
    sessionId: string;
    reason: string;
  }): Promise<void> {
    const reason = parseAdminReason(input.reason);
    if (!reason) throw new IdentityError("INVALID_INPUT", "Reason is required");
    const deleted = await this.db
      .delete(sessionTable)
      .where(and(eq(sessionTable.id, input.sessionId), eq(sessionTable.userId, input.targetUserId)))
      .returning({ id: sessionTable.id });
    if (deleted.length === 0) throw new IdentityError("NOT_FOUND", "Session not found");
    await this.audit.record({
      actorUserId: input.actorUserId,
      action: "admin.session.revoke",
      resourceType: "session",
      resourceId: input.sessionId,
      metadata: { targetUserId: input.targetUserId, reason },
    });
  }

  private async requireProfile(userId: string) {
    const [row] = await this.db
      .select({ globalRole: userProfiles.globalRole })
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);
    if (row) return row;
    await this.db.insert(userProfiles).values({ userId });
    return { globalRole: "USER" as const };
  }
}

export function createIdentityDirectory(db?: Database, audit?: AuditService): IdentityDirectory {
  const resolved = db ?? requireDb();
  return new IdentityDirectory(resolved, audit ?? createDrizzleAuditService(resolved));
}
