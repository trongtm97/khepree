import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import {
  announcementReceipts,
  announcementTranslations,
  createDrizzleAuditService,
  createPublicId,
  getDb,
  productTranslations,
  products,
  softwareReleases,
  systemAnnouncements,
  type AnnouncementCtaKind,
  type AuditService,
  type Database,
} from "@khepree/db";
import { CatalogError } from "../product/admin";
import { sanitizeAnnouncementBody } from "./body";
import { validateAnnouncementCta } from "./cta-policy";
import { hasDefaultLocaleTranslation, resolveAnnouncementCopy } from "./locale";
import {
  buildReleaseWhatsNewDraftInput,
  type PublishWhatsNewForReleaseResult,
  type ReleaseNotifySource,
} from "./release-notify";
import {
  assertValidAnnouncementSchedule,
  assertValidAppVersionRange,
  matchesAnnouncementTargeting,
  normalizeAppVersionField,
  type DesktopAnnouncementQuery,
} from "./targeting";
import type {
  AdminAnnouncementListItem,
  AnnouncementRecord,
  AnnouncementTranslationInput,
  CreateAnnouncementDraftInput,
  DesktopAnnouncementView,
  DesktopAnnouncementsPage,
  ListAdminAnnouncementsQuery,
  ListDesktopAnnouncementsQuery,
  UpdateAnnouncementDraftInput,
} from "./types";
import {
  clampAnnouncementLimit,
  decodeAnnouncementCursor,
  paginateAnnouncements,
} from "./pagination";

function mapAnnouncement(
  row: typeof systemAnnouncements.$inferSelect,
  translations: AnnouncementTranslationInput[],
): AnnouncementRecord {
  return {
    id: row.id,
    publicId: row.publicId,
    productId: row.productId,
    relatedReleaseId: row.relatedReleaseId ?? null,
    severity: row.severity,
    status: row.status,
    type: row.type,
    targetPlatform: row.targetPlatform,
    targetArchitecture: row.targetArchitecture,
    releaseChannel: row.releaseChannel,
    minimumAppVersion: row.minimumAppVersion,
    maximumAppVersion: row.maximumAppVersion,
    startsAt: row.startsAt,
    expiresAt: row.expiresAt,
    publishedAt: row.publishedAt,
    ctaKind: row.ctaKind,
    ctaPayload: (row.ctaPayload as Record<string, unknown> | null) ?? null,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    translations,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function normalizeTranslations(translations: AnnouncementTranslationInput[]): AnnouncementTranslationInput[] {
  const byLocale = new Map<string, AnnouncementTranslationInput>();
  for (const row of translations) {
    const locale = row.locale.trim();
    const title = row.title.trim();
    if (!locale || !title) continue;
    byLocale.set(locale, {
      locale,
      title,
      body: sanitizeAnnouncementBody(row.body),
      ctaLabel: row.ctaLabel?.trim() || null,
    });
  }
  return [...byLocale.values()];
}

export class AnnouncementService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  private async loadTranslations(announcementIds: string[]): Promise<Map<string, AnnouncementTranslationInput[]>> {
    if (announcementIds.length === 0) return new Map();
    const rows = await this.db
      .select()
      .from(announcementTranslations)
      .where(inArray(announcementTranslations.announcementId, announcementIds));

    const byAnnouncement = new Map<string, AnnouncementTranslationInput[]>();
    for (const row of rows) {
      const list = byAnnouncement.get(row.announcementId) ?? [];
      list.push({ locale: row.locale, title: row.title, body: row.body, ctaLabel: row.ctaLabel });
      byAnnouncement.set(row.announcementId, list);
    }
    return byAnnouncement;
  }

  private validateDraftInput(input: CreateAnnouncementDraftInput): {
    minimumAppVersion: string | null;
    maximumAppVersion: string | null;
    ctaKind: AnnouncementCtaKind;
    ctaPayload: Record<string, unknown> | null;
    translations: AnnouncementTranslationInput[];
  } {
    const translations = normalizeTranslations(input.translations);
    if (translations.length === 0) {
      throw new CatalogError("INVALID_INPUT", "Cần ít nhất một bản dịch");
    }

    let minimumAppVersion: string | null;
    let maximumAppVersion: string | null;
    try {
      minimumAppVersion = normalizeAppVersionField(input.minimumAppVersion);
      maximumAppVersion = normalizeAppVersionField(input.maximumAppVersion);
      assertValidAnnouncementSchedule(input.startsAt ?? null, input.expiresAt ?? null);
      assertValidAppVersionRange(minimumAppVersion, maximumAppVersion);
    } catch (error) {
      throw new CatalogError(
        "INVALID_INPUT",
        error instanceof Error ? error.message : "Dữ liệu không hợp lệ",
      );
    }

    const ctaKind = input.ctaKind ?? "none";
    let ctaPayload: Record<string, unknown> | null;
    try {
      const validated = validateAnnouncementCta(ctaKind, input.ctaPayload ?? null);
      ctaPayload = validated ? { ...validated } : null;
    } catch (error) {
      throw new CatalogError(
        "INVALID_INPUT",
        error instanceof Error ? error.message : "CTA không hợp lệ",
      );
    }

    return { minimumAppVersion, maximumAppVersion, ctaKind, ctaPayload, translations };
  }

  private async assertProductExists(productId: string | null | undefined): Promise<void> {
    if (!productId) return;
    const [product] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    if (!product) throw new CatalogError("NOT_FOUND", "Sản phẩm không tồn tại");
  }

  private async resolveRelatedReleaseId(input: {
    relatedReleaseId?: string | null;
    ctaKind: AnnouncementCtaKind;
    ctaPayload: Record<string, unknown> | null;
    productId: string | null;
  }): Promise<string | null> {
    if (input.relatedReleaseId) return input.relatedReleaseId;
    if (input.ctaKind !== "software_update") return null;
    const releasePublicId =
      typeof input.ctaPayload?.releasePublicId === "string"
        ? input.ctaPayload.releasePublicId
        : null;
    if (!releasePublicId) return null;

    const [release] = await this.db
      .select({ id: softwareReleases.id, productId: softwareReleases.productId })
      .from(softwareReleases)
      .where(eq(softwareReleases.publicId, releasePublicId))
      .limit(1);
    if (!release) {
      throw new CatalogError("NOT_FOUND", "Release CTA không tồn tại");
    }
    if (input.productId && release.productId !== input.productId) {
      throw new CatalogError("INVALID_INPUT", "Release CTA không thuộc sản phẩm đã chọn");
    }
    return release.id;
  }

  private async replaceTranslations(
    announcementId: string,
    translations: AnnouncementTranslationInput[],
  ): Promise<void> {
    await this.db
      .delete(announcementTranslations)
      .where(eq(announcementTranslations.announcementId, announcementId));
    if (translations.length === 0) return;
    await this.db.insert(announcementTranslations).values(
      translations.map((row) => ({
        announcementId,
        locale: row.locale,
        title: row.title,
        body: row.body,
        ctaLabel: row.ctaLabel ?? null,
      })),
    );
  }

  async createDraft(input: CreateAnnouncementDraftInput): Promise<AnnouncementRecord> {
    await this.assertProductExists(input.productId ?? null);
    const validated = this.validateDraftInput(input);
    const relatedReleaseId =
      input.bindRelatedRelease === false
        ? null
        : await this.resolveRelatedReleaseId({
            relatedReleaseId: input.relatedReleaseId ?? null,
            ctaKind: validated.ctaKind,
            ctaPayload: validated.ctaPayload,
            productId: input.productId ?? null,
          });

    if (relatedReleaseId) {
      const existingForRelease = await this.findByRelatedReleaseId(relatedReleaseId);
      if (existingForRelease) {
        throw new CatalogError(
          "CONFLICT",
          `Release đã có thông báo liên kết (${existingForRelease.publicId})`,
        );
      }
    }

    const publicId = createPublicId("ann");
    const [row] = await this.db
      .insert(systemAnnouncements)
      .values({
        publicId,
        productId: input.productId ?? null,
        relatedReleaseId,
        severity: input.severity ?? "info",
        type: input.type ?? "general",
        status: "draft",
        targetPlatform: input.targetPlatform ?? null,
        targetArchitecture: input.targetArchitecture ?? null,
        releaseChannel: input.releaseChannel ?? null,
        minimumAppVersion: validated.minimumAppVersion,
        maximumAppVersion: validated.maximumAppVersion,
        startsAt: input.startsAt ?? null,
        expiresAt: input.expiresAt ?? null,
        ctaKind: validated.ctaKind,
        ctaPayload: validated.ctaPayload,
        createdBy: input.actorUserId ?? null,
        updatedBy: input.actorUserId ?? null,
      })
      .returning();
    if (!row) throw new CatalogError("CONFLICT", "Không thể tạo thông báo");

    await this.replaceTranslations(row.id, validated.translations);

    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.announcement.create",
      resourceType: "announcement",
      resourceId: row.publicId,
    });

    return mapAnnouncement(row, validated.translations);
  }

  async updateDraft(input: UpdateAnnouncementDraftInput): Promise<AnnouncementRecord> {
    const [existing] = await this.db
      .select()
      .from(systemAnnouncements)
      .where(eq(systemAnnouncements.id, input.announcementId))
      .limit(1);
    if (!existing) throw new CatalogError("NOT_FOUND", "Thông báo không tồn tại");
    if (existing.status !== "draft") {
      throw new CatalogError("INVALID_INPUT", "Chỉ có thể sửa thông báo draft");
    }

    await this.assertProductExists(input.productId ?? null);
    const validated = this.validateDraftInput(input);
    const relatedReleaseId = await this.resolveRelatedReleaseId({
      relatedReleaseId: input.relatedReleaseId ?? null,
      ctaKind: validated.ctaKind,
      ctaPayload: validated.ctaPayload,
      productId: input.productId ?? null,
    });

    if (relatedReleaseId) {
      const existingForRelease = await this.findByRelatedReleaseId(relatedReleaseId);
      if (existingForRelease && existingForRelease.id !== input.announcementId) {
        throw new CatalogError(
          "CONFLICT",
          `Release đã có thông báo liên kết (${existingForRelease.publicId})`,
        );
      }
    }

    const [row] = await this.db
      .update(systemAnnouncements)
      .set({
        productId: input.productId ?? null,
        relatedReleaseId,
        severity: input.severity ?? existing.severity,
        type: input.type ?? existing.type,
        targetPlatform: input.targetPlatform ?? null,
        targetArchitecture: input.targetArchitecture ?? null,
        releaseChannel: input.releaseChannel ?? null,
        minimumAppVersion: validated.minimumAppVersion,
        maximumAppVersion: validated.maximumAppVersion,
        startsAt: input.startsAt ?? null,
        expiresAt: input.expiresAt ?? null,
        ctaKind: validated.ctaKind,
        ctaPayload: validated.ctaPayload,
        updatedBy: input.actorUserId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(systemAnnouncements.id, input.announcementId))
      .returning();
    if (!row) throw new CatalogError("NOT_FOUND", "Thông báo không tồn tại");

    await this.replaceTranslations(row.id, validated.translations);

    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.announcement.update",
      resourceType: "announcement",
      resourceId: row.publicId,
    });

    return mapAnnouncement(row, validated.translations);
  }

  async publish(announcementId: string, actorUserId?: string | null): Promise<AnnouncementRecord> {
    const [existing] = await this.db
      .select()
      .from(systemAnnouncements)
      .where(eq(systemAnnouncements.id, announcementId))
      .limit(1);
    if (!existing) throw new CatalogError("NOT_FOUND", "Thông báo không tồn tại");
    if (existing.status !== "draft") {
      throw new CatalogError("INVALID_INPUT", "Chỉ có thể publish thông báo draft");
    }

    await this.assertProductExists(existing.productId);
    try {
      assertValidAnnouncementSchedule(existing.startsAt, existing.expiresAt);
    } catch (error) {
      throw new CatalogError(
        "INVALID_INPUT",
        error instanceof Error ? error.message : "Thời gian không hợp lệ",
      );
    }

    const translations = await this.db
      .select()
      .from(announcementTranslations)
      .where(eq(announcementTranslations.announcementId, announcementId));
    const normalized = translations.map((row) => ({
      locale: row.locale,
      title: row.title,
      body: row.body,
    }));
    if (!hasDefaultLocaleTranslation(normalized)) {
      throw new CatalogError("INVALID_INPUT", "Thiếu bản dịch locale mặc định (vi)");
    }

    try {
      validateAnnouncementCta(existing.ctaKind, existing.ctaPayload ?? null);
    } catch (error) {
      throw new CatalogError(
        "INVALID_INPUT",
        error instanceof Error ? error.message : "CTA không hợp lệ",
      );
    }

    const [row] = await this.db
      .update(systemAnnouncements)
      .set({
        status: "published",
        publishedAt: new Date(),
        updatedBy: actorUserId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(systemAnnouncements.id, announcementId))
      .returning();
    if (!row) throw new CatalogError("NOT_FOUND", "Thông báo không tồn tại");

    await this.audit.record({
      actorUserId: actorUserId ?? null,
      action: "catalog.announcement.publish",
      resourceType: "announcement",
      resourceId: row.publicId,
    });

    return mapAnnouncement(row, normalized);
  }

  async expire(announcementId: string, actorUserId?: string | null): Promise<AnnouncementRecord> {
    return this.setStatus(announcementId, "expired", "catalog.announcement.expire", actorUserId);
  }

  async archive(announcementId: string, actorUserId?: string | null): Promise<AnnouncementRecord> {
    return this.setStatus(announcementId, "archived", "catalog.announcement.archive", actorUserId);
  }

  private async setStatus(
    announcementId: string,
    status: "expired" | "archived",
    action: string,
    actorUserId?: string | null,
  ): Promise<AnnouncementRecord> {
    const [existing] = await this.db
      .select()
      .from(systemAnnouncements)
      .where(eq(systemAnnouncements.id, announcementId))
      .limit(1);
    if (!existing) throw new CatalogError("NOT_FOUND", "Thông báo không tồn tại");
    if (existing.status !== "published") {
      throw new CatalogError("INVALID_INPUT", "Chỉ có thể expire/archive thông báo đã publish");
    }

    const [row] = await this.db
      .update(systemAnnouncements)
      .set({ status, updatedBy: actorUserId ?? null, updatedAt: new Date() })
      .where(eq(systemAnnouncements.id, announcementId))
      .returning();
    if (!row) throw new CatalogError("NOT_FOUND", "Thông báo không tồn tại");

    const translationsById = await this.loadTranslations([row.id]);
    const translations = translationsById.get(row.id) ?? [];

    await this.audit.record({
      actorUserId: actorUserId ?? null,
      action,
      resourceType: "announcement",
      resourceId: row.publicId,
    });

    return mapAnnouncement(row, translations);
  }

  private matchesDesktopContext(
    row: typeof systemAnnouncements.$inferSelect,
    query: DesktopAnnouncementQuery & { productId: string },
  ): boolean {
    return matchesAnnouncementTargeting(
      {
        productId: row.productId,
        targetPlatform: row.targetPlatform,
        targetArchitecture: row.targetArchitecture,
        releaseChannel: row.releaseChannel,
        minimumAppVersion: row.minimumAppVersion,
        maximumAppVersion: row.maximumAppVersion,
        startsAt: row.startsAt,
        expiresAt: row.expiresAt,
        status: row.status,
      },
      query,
    );
  }

  private async assertAnnouncementDelivered(input: {
    announcementId: string;
    userId: string;
    context: DesktopAnnouncementQuery & { productId: string };
  }): Promise<typeof systemAnnouncements.$inferSelect> {
    const [announcement] = await this.db
      .select()
      .from(systemAnnouncements)
      .where(eq(systemAnnouncements.id, input.announcementId))
      .limit(1);
    if (!announcement || announcement.status !== "published") {
      throw new CatalogError("NOT_FOUND", "Thông báo không tồn tại");
    }
    if (!this.matchesDesktopContext(announcement, input.context)) {
      throw new CatalogError("NOT_FOUND", "Thông báo không tồn tại");
    }

    const [receipt] = await this.db
      .select()
      .from(announcementReceipts)
      .where(
        and(
          eq(announcementReceipts.announcementId, announcement.id),
          eq(announcementReceipts.userId, input.userId),
        ),
      )
      .limit(1);
    if (!receipt?.firstDeliveredAt) {
      throw new CatalogError("NOT_FOUND", "Thông báo không tồn tại");
    }

    return announcement;
  }

  async listForDesktop(query: ListDesktopAnnouncementsQuery): Promise<DesktopAnnouncementsPage> {
    let appVersion: string;
    try {
      const normalized = normalizeAppVersionField(query.appVersion);
      if (!normalized) {
        throw new CatalogError("INVALID_INPUT", "appVersion phải là SemVer hợp lệ");
      }
      appVersion = normalized;
    } catch (error) {
      if (error instanceof CatalogError) throw error;
      throw new CatalogError(
        "INVALID_INPUT",
        error instanceof Error ? error.message : "appVersion phải là SemVer hợp lệ",
      );
    }

    const rows = await this.db
      .select()
      .from(systemAnnouncements)
      .where(eq(systemAnnouncements.status, "published"))
      .orderBy(desc(systemAnnouncements.publishedAt));

    const eligible = rows.filter((row) =>
      this.matchesDesktopContext(row, {
        productId: query.productId,
        appVersion,
        platform: query.platform,
        architecture: query.architecture,
        channel: query.channel,
      }),
    );
    const cursor = decodeAnnouncementCursor(query.cursor);
    if (query.cursor && !cursor) {
      throw new CatalogError("INVALID_INPUT", "cursor không hợp lệ");
    }
    const limit = clampAnnouncementLimit(query.limit);
    const { items: pageRows, nextCursor } = paginateAnnouncements(eligible, { limit, cursor });
    if (pageRows.length === 0) {
      return { items: [], nextCursor: null };
    }

    const announcementIds = pageRows.map((row) => row.id);
    const [translationRows, receiptRows] = await Promise.all([
      this.db
        .select()
        .from(announcementTranslations)
        .where(inArray(announcementTranslations.announcementId, announcementIds)),
      this.db
        .select()
        .from(announcementReceipts)
        .where(
          and(
            eq(announcementReceipts.userId, query.userId),
            inArray(announcementReceipts.announcementId, announcementIds),
          ),
        ),
    ]);

    const translationsByAnnouncement = new Map<string, AnnouncementTranslationInput[]>();
    for (const row of translationRows) {
      const list = translationsByAnnouncement.get(row.announcementId) ?? [];
      list.push({ locale: row.locale, title: row.title, body: row.body, ctaLabel: row.ctaLabel });
      translationsByAnnouncement.set(row.announcementId, list);
    }

    const receiptsByAnnouncement = new Map(
      receiptRows.map((row) => [row.announcementId, row]),
    );

    const now = new Date();
    const views: DesktopAnnouncementView[] = [];

    for (const row of pageRows) {
      const receipt = receiptsByAnnouncement.get(row.id);
      if (receipt?.dismissedAt) continue;

      await this.db
        .insert(announcementReceipts)
        .values({
          announcementId: row.id,
          userId: query.userId,
          firstDeliveredAt: now,
        })
        .onConflictDoUpdate({
          target: [announcementReceipts.announcementId, announcementReceipts.userId],
          set: {
            firstDeliveredAt: sql`COALESCE(${announcementReceipts.firstDeliveredAt}, excluded.first_delivered_at)`,
            updatedAt: now,
          },
        });

      const translations = translationsByAnnouncement.get(row.id) ?? [];
      const copy = resolveAnnouncementCopy(
        query.locale,
        translations.map((entry) => ({
          locale: entry.locale,
          title: entry.title,
          body: entry.body ?? null,
        })),
      );
      if (!copy) continue;

      const ctaLabel =
        translations.find((t) => t.locale === query.locale)?.ctaLabel ??
        translations.find((t) => t.locale === "vi")?.ctaLabel ??
        translations.find((t) => t.locale === "en")?.ctaLabel ??
        null;

      views.push({
        publicId: row.publicId,
        severity: row.severity,
        type: row.type,
        title: copy.title,
        body: copy.body,
        ctaLabel,
        ctaKind: row.ctaKind,
        ctaPayload: (row.ctaPayload as Record<string, unknown> | null) ?? null,
        publishedAt: row.publishedAt,
        expiresAt: row.expiresAt,
        readAt: receipt?.readAt ?? null,
        dismissedAt: receipt?.dismissedAt ?? null,
      });
    }

    return { items: views, nextCursor };
  }

  async markRead(input: {
    announcementPublicId: string;
    userId: string;
    context: DesktopAnnouncementQuery & { productId: string };
  }): Promise<{ readAt: Date }> {
    const [announcement] = await this.db
      .select()
      .from(systemAnnouncements)
      .where(eq(systemAnnouncements.publicId, input.announcementPublicId))
      .limit(1);
    if (!announcement) throw new CatalogError("NOT_FOUND", "Thông báo không tồn tại");

    await this.assertAnnouncementDelivered({
      announcementId: announcement.id,
      userId: input.userId,
      context: input.context,
    });

    const now = new Date();
    const [receipt] = await this.db
      .insert(announcementReceipts)
      .values({
        announcementId: announcement.id,
        userId: input.userId,
        firstDeliveredAt: now,
        readAt: now,
      })
      .onConflictDoUpdate({
        target: [announcementReceipts.announcementId, announcementReceipts.userId],
        set: {
          firstDeliveredAt: sql`COALESCE(${announcementReceipts.firstDeliveredAt}, ${now})`,
          readAt: sql`COALESCE(${announcementReceipts.readAt}, ${now})`,
          updatedAt: now,
        },
      })
      .returning({ readAt: announcementReceipts.readAt });

    return { readAt: receipt?.readAt ?? now };
  }

  async dismiss(input: {
    announcementPublicId: string;
    userId: string;
    context: DesktopAnnouncementQuery & { productId: string };
  }): Promise<{ dismissedAt: Date; readAt: Date | null }> {
    const [announcement] = await this.db
      .select()
      .from(systemAnnouncements)
      .where(eq(systemAnnouncements.publicId, input.announcementPublicId))
      .limit(1);
    if (!announcement) throw new CatalogError("NOT_FOUND", "Thông báo không tồn tại");

    await this.assertAnnouncementDelivered({
      announcementId: announcement.id,
      userId: input.userId,
      context: input.context,
    });

    const now = new Date();
    const [receipt] = await this.db
      .insert(announcementReceipts)
      .values({
        announcementId: announcement.id,
        userId: input.userId,
        firstDeliveredAt: now,
        dismissedAt: now,
      })
      .onConflictDoUpdate({
        target: [announcementReceipts.announcementId, announcementReceipts.userId],
        set: {
          firstDeliveredAt: sql`COALESCE(${announcementReceipts.firstDeliveredAt}, ${now})`,
          dismissedAt: sql`COALESCE(${announcementReceipts.dismissedAt}, ${now})`,
          updatedAt: now,
        },
      })
      .returning({
        readAt: announcementReceipts.readAt,
        dismissedAt: announcementReceipts.dismissedAt,
      });

    return {
      dismissedAt: receipt?.dismissedAt ?? now,
      readAt: receipt?.readAt ?? null,
    };
  }

  async getByPublicId(publicId: string): Promise<AnnouncementRecord | null> {
    const [row] = await this.db
      .select()
      .from(systemAnnouncements)
      .where(eq(systemAnnouncements.publicId, publicId))
      .limit(1);
    if (!row) return null;
    const translationsById = await this.loadTranslations([row.id]);
    return mapAnnouncement(row, translationsById.get(row.id) ?? []);
  }

  async listForAdmin(query: ListAdminAnnouncementsQuery = {}): Promise<{
    items: AdminAnnouncementListItem[];
    hasMore: boolean;
  }> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 20));
    const now = new Date();

    const conditions = [];
    if (query.productId) {
      conditions.push(eq(systemAnnouncements.productId, query.productId));
    }
    if (query.status) {
      conditions.push(eq(systemAnnouncements.status, query.status));
    }
    if (query.severity) {
      conditions.push(eq(systemAnnouncements.severity, query.severity));
    }
    if (query.platform) {
      conditions.push(eq(systemAnnouncements.targetPlatform, query.platform));
    }
    if (query.channel) {
      conditions.push(eq(systemAnnouncements.releaseChannel, query.channel));
    }
    if (query.schedule === "active") {
      conditions.push(eq(systemAnnouncements.status, "published"));
      conditions.push(
        or(
          sql`${systemAnnouncements.startsAt} IS NULL`,
          sql`${systemAnnouncements.startsAt} <= ${now}`,
        )!,
      );
      conditions.push(
        or(
          sql`${systemAnnouncements.expiresAt} IS NULL`,
          sql`${systemAnnouncements.expiresAt} > ${now}`,
        )!,
      );
    } else if (query.schedule === "expired") {
      conditions.push(
        or(
          eq(systemAnnouncements.status, "expired"),
          eq(systemAnnouncements.status, "archived"),
          and(
            eq(systemAnnouncements.status, "published"),
            sql`${systemAnnouncements.expiresAt} IS NOT NULL`,
            sql`${systemAnnouncements.expiresAt} <= ${now}`,
          ),
        )!,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await this.db
      .select({
        id: systemAnnouncements.id,
        publicId: systemAnnouncements.publicId,
        productId: systemAnnouncements.productId,
        productLabel: productTranslations.name,
        productSlug: products.slug,
        severity: systemAnnouncements.severity,
        status: systemAnnouncements.status,
        targetPlatform: systemAnnouncements.targetPlatform,
        targetArchitecture: systemAnnouncements.targetArchitecture,
        releaseChannel: systemAnnouncements.releaseChannel,
        startsAt: systemAnnouncements.startsAt,
        expiresAt: systemAnnouncements.expiresAt,
        publishedAt: systemAnnouncements.publishedAt,
        updatedAt: systemAnnouncements.updatedAt,
      })
      .from(systemAnnouncements)
      .leftJoin(products, eq(systemAnnouncements.productId, products.id))
      .leftJoin(
        productTranslations,
        and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, "vi")),
      )
      .where(whereClause)
      .orderBy(desc(systemAnnouncements.updatedAt))
      .limit(pageSize + 1)
      .offset((page - 1) * pageSize);

    const hasMore = rows.length > pageSize;
    const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
    if (pageRows.length === 0) {
      return { items: [], hasMore: false };
    }

    const ids = pageRows.map((row) => row.id);
    const translationRows = await this.db
      .select()
      .from(announcementTranslations)
      .where(inArray(announcementTranslations.announcementId, ids));

    const titleByAnnouncement = new Map<string, { vi: string | null; en: string | null }>();
    for (const row of translationRows) {
      const entry = titleByAnnouncement.get(row.announcementId) ?? { vi: null, en: null };
      if (row.locale === "vi") entry.vi = row.title;
      if (row.locale === "en") entry.en = row.title;
      titleByAnnouncement.set(row.announcementId, entry);
    }

    const items: AdminAnnouncementListItem[] = pageRows.map((row) => {
      const titles = titleByAnnouncement.get(row.id);
      return {
        id: row.id,
        publicId: row.publicId,
        productId: row.productId,
        productLabel: row.productLabel ?? row.productSlug,
        severity: row.severity,
        status: row.status,
        targetPlatform: row.targetPlatform,
        targetArchitecture: row.targetArchitecture,
        releaseChannel: row.releaseChannel,
        startsAt: row.startsAt,
        expiresAt: row.expiresAt,
        publishedAt: row.publishedAt,
        titleVi: titles?.vi ?? null,
        titleEn: titles?.en ?? null,
        updatedAt: row.updatedAt,
      };
    });

    return { items, hasMore };
  }

  async clonePublishedToDraft(
    announcementId: string,
    actorUserId?: string | null,
  ): Promise<AnnouncementRecord> {
    const [existing] = await this.db
      .select()
      .from(systemAnnouncements)
      .where(eq(systemAnnouncements.id, announcementId))
      .limit(1);
    if (!existing) throw new CatalogError("NOT_FOUND", "Thông báo không tồn tại");
    if (existing.status !== "published") {
      throw new CatalogError("INVALID_INPUT", "Chỉ có thể nhân bản thông báo đã xuất bản");
    }

    const translationsById = await this.loadTranslations([existing.id]);
    const translations = translationsById.get(existing.id) ?? [];

    return this.createDraft({
      productId: existing.productId,
      severity: existing.severity,
      type: existing.type,
      targetPlatform: existing.targetPlatform,
      targetArchitecture: existing.targetArchitecture,
      releaseChannel: existing.releaseChannel,
      minimumAppVersion: existing.minimumAppVersion,
      maximumAppVersion: existing.maximumAppVersion,
      startsAt: existing.startsAt,
      expiresAt: existing.expiresAt,
      ctaKind: existing.ctaKind,
      ctaPayload: (existing.ctaPayload as Record<string, unknown> | null) ?? null,
      translations,
      actorUserId,
      bindRelatedRelease: false,
    });
  }

  async findByRelatedReleaseId(releaseId: string): Promise<AnnouncementRecord | null> {
    const [row] = await this.db
      .select()
      .from(systemAnnouncements)
      .where(eq(systemAnnouncements.relatedReleaseId, releaseId))
      .limit(1);
    if (!row) return null;
    const translationsById = await this.loadTranslations([row.id]);
    return mapAnnouncement(row, translationsById.get(row.id) ?? []);
  }

  /**
   * Idempotent: create+publish a whats_new announcement for a release, or return the existing one.
   */
  async publishWhatsNewForRelease(
    release: ReleaseNotifySource,
    actorUserId?: string | null,
  ): Promise<PublishWhatsNewForReleaseResult> {
    const existing = await this.findByRelatedReleaseId(release.id);
    if (existing) {
      return { announcement: existing, created: false };
    }

    const draftInput = buildReleaseWhatsNewDraftInput(release, actorUserId);
    const draft = await this.createDraft(draftInput);
    const announcement = await this.publish(draft.id, actorUserId);
    return { announcement, created: true };
  }
}

export function createAnnouncementService(
  db?: Database | null,
  audit?: AuditService,
): AnnouncementService {
  const resolved = db ?? getDb();
  if (!resolved) throw new CatalogError("NOT_CONFIGURED", "Database is not configured");
  return new AnnouncementService(resolved, audit ?? createDrizzleAuditService(resolved));
}
