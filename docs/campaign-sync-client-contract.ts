/**
 * Campaign Sync Client Contract — khepree-novel-ai
 *
 * Drop this file into the desktop app (e.g. src/sync/campaign-sync-client.ts).
 * It provides the full SDK for opt-in campaign status sync.
 *
 * PRIVACY: Only aggregate counts and stage are ever sent.
 * Toggle is OFF by default. User must explicitly enable it.
 *
 * --- Allowed fields ---
 * campaignPublicId, appVersion, totalProjects, totalChapters,
 * countByStatus, overallPercent, stage, startedAt, updatedAt,
 * completedAt, errorCode
 *
 * --- NEVER include ---
 * Novel title, chapter name, author, file path, source text,
 * translation, prompt, glossary, memory, audit data, cookies,
 * browser profile path, account secrets, stack traces.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type CampaignSyncStage = "idle" | "active" | "completed" | "error";

/** Closed payload — only these fields are accepted by the server. */
export interface CampaignSyncPayload {
  campaignPublicId: string;       // opaque, desktop-generated, max 64 chars
  appVersion?: string;            // semver, max 32 chars
  totalProjects: number;          // ≥ 0
  totalChapters: number;          // ≥ 0
  countByStatus: {
    pending: number;
    in_progress: number;
    completed: number;
    error: number;
  };
  overallPercent: number;         // 0–100
  stage: CampaignSyncStage;
  startedAt?: string | null;      // ISO 8601
  updatedAt: string;              // ISO 8601 — client-side timestamp
  completedAt?: string | null;    // ISO 8601
  errorCode?: string | null;      // normalized, max 64 chars, no stack trace
}

export interface CampaignSyncResponse {
  ok: true;
  data: { syncedAt: string };
}

export interface CampaignSyncOptions {
  /** Backend base URL e.g. "https://api.khepree.com" */
  baseUrl: string;
  /** Return current desktop access token, or null if not authenticated */
  getAccessToken: () => Promise<string | null>;
  /** Read opt-in preference from local storage. Called before every flush. */
  readEnabled: () => boolean;
  /** Persist opt-in preference to local storage */
  writeEnabled: (value: boolean) => void;
  /** Persist queue to local storage (called after every push/flush) */
  persistQueue: (queue: CampaignSyncPayload[]) => void;
  /** Load queue from local storage on init */
  loadQueue: () => CampaignSyncPayload[];
}

// ─── Client ─────────────────────────────────────────────────────────────────

export class CampaignSyncClient {
  private queue: Map<string, CampaignSyncPayload>;
  private flushing = false;

  constructor(private readonly opts: CampaignSyncOptions) {
    // Restore persisted queue on init
    const persisted = opts.loadQueue();
    this.queue = new Map(persisted.map((p) => [p.campaignPublicId, p]));
  }

  /** Privacy copy — display in UI before showing the toggle. */
  static readonly PRIVACY_COPY = {
    en: "Share campaign progress with Khepree — off by default. Only aggregate counts and status are sent. No story content, filenames, or personal data beyond your account identity.",
    vi: "Chia sẻ tiến độ chiến dịch với Khepree — mặc định tắt. Chỉ gửi số lượng tổng hợp và trạng thái. Không gửi nội dung truyện, tên file hoặc dữ liệu cá nhân ngoài tài khoản của bạn.",
  } as const;

  isEnabled(): boolean {
    return this.opts.readEnabled();
  }

  /** Toggle opt-in. Setting false immediately stops future flushes. */
  setEnabled(value: boolean): void {
    this.opts.writeEnabled(value);
    // When disabled, drain queue to memory without sending (retain for re-enable)
    if (!value) {
      // Do nothing — queue remains in memory/storage but won't be sent
    }
  }

  /**
   * Enqueue a payload for the given campaign.
   * Coalesces: only the latest payload per campaignPublicId is kept.
   * Does NOT send immediately — call flush() to send.
   */
  push(payload: CampaignSyncPayload): void {
    if (!this.isEnabled()) return; // silent discard when disabled
    this.queue.set(payload.campaignPublicId, { ...payload, updatedAt: new Date().toISOString() });
    this.opts.persistQueue([...this.queue.values()]);
  }

  /**
   * Send all queued payloads to the server.
   * - Skips if disabled.
   * - Skips if already flushing (no concurrent flushes).
   * - Removes successfully sent items from queue.
   * - Leaves failed items for retry.
   */
  async flush(): Promise<void> {
    if (!this.isEnabled() || this.flushing || this.queue.size === 0) return;

    const token = await this.opts.getAccessToken();
    if (!token) return; // not authenticated — retry later

    this.flushing = true;
    const snapshot = [...this.queue.values()];

    try {
      for (const payload of snapshot) {
        const ok = await this.sendOne(payload, token);
        if (ok) {
          this.queue.delete(payload.campaignPublicId);
        }
      }
    } finally {
      this.flushing = false;
      this.opts.persistQueue([...this.queue.values()]);
    }
  }

  /**
   * Delete synced status for a campaign from the server.
   * Also removes it from the local queue.
   */
  async deleteRemote(campaignPublicId: string): Promise<void> {
    const token = await this.opts.getAccessToken();
    if (!token) throw new Error("Not authenticated");

    const response = await fetch(
      `${this.opts.baseUrl}/api/v1/desktop/campaign-sync/${encodeURIComponent(campaignPublicId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error((body as any)?.error?.message ?? `Delete failed: ${response.status}`);
    }

    this.queue.delete(campaignPublicId);
    this.opts.persistQueue([...this.queue.values()]);
  }

  private async sendOne(payload: CampaignSyncPayload, token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.opts.baseUrl}/api/v1/desktop/campaign-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      return response.ok || response.status === 409; // 409 = stale, treat as success
    } catch {
      return false; // network error — keep in queue for retry
    }
  }
}

// ─── Self-check (run once at startup in dev/test) ───────────────────────────

/**
 * Verifies that a serialized payload contains none of the forbidden fields.
 * Call this in your test suite: assertNoForbiddenFields(yourPayload)
 */
export function assertNoForbiddenFields(payload: unknown): void {
  const FORBIDDEN = [
    "title", "novelTitle", "chapterName", "author", "filePath", "path",
    "sourceText", "source_text", "translationText", "translation",
    "prompt", "glossary", "memory", "auditEvidence", "audit_evidence",
    "cookie", "sessionToken", "browserProfilePath", "accountSecret",
    "stackTrace", "stack_trace", "rawProviderResponse", "raw_response",
  ] as const;

  const serialized = JSON.stringify(payload);
  const parsed = JSON.parse(serialized) as Record<string, unknown>;

  for (const key of FORBIDDEN) {
    if (key in parsed) {
      throw new Error(`assertNoForbiddenFields: forbidden field "${key}" found in payload`);
    }
  }
}
