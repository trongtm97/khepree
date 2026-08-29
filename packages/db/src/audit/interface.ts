export interface AuditRecordInput {
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

/** Append-only audit trail — implementations must never update or delete rows. */
export interface AuditService {
  record(input: AuditRecordInput): Promise<void>;
}
