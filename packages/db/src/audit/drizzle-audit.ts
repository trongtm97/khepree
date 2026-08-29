import type { Database } from "../client";
import { auditLogs } from "../schema/system";
import type { AuditRecordInput, AuditService } from "./interface";

export function createDrizzleAuditService(db: Database): AuditService {
  return {
    async record(input: AuditRecordInput): Promise<void> {
      await db.insert(auditLogs).values({
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        metadata: input.metadata ?? null,
        ipAddress: input.ipAddress ?? null,
      });
    },
  };
}
