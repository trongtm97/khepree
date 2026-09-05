import type {
  AnnouncementCtaKind,
  AnnouncementSeverity,
  AnnouncementStatus,
  AnnouncementType,
  ReleaseArchitecture,
  ReleaseChannel,
  ReleasePlatform,
} from "@khepree/db";

export interface AnnouncementTranslationInput {
  locale: string;
  title: string;
  body?: string | null;
  /** Locale-specific CTA button label. Null = use platform default. */
  ctaLabel?: string | null;
}

export interface AnnouncementRecord {
  id: string;
  publicId: string;
  productId: string | null;
  relatedReleaseId: string | null;
  severity: AnnouncementSeverity;
  status: AnnouncementStatus;
  type: AnnouncementType;
  targetPlatform: ReleasePlatform | null;
  targetArchitecture: ReleaseArchitecture | null;
  releaseChannel: ReleaseChannel | null;
  minimumAppVersion: string | null;
  maximumAppVersion: string | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  publishedAt: Date | null;
  ctaKind: AnnouncementCtaKind;
  ctaPayload: Record<string, unknown> | null;
  createdBy: string | null;
  updatedBy: string | null;
  translations: AnnouncementTranslationInput[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAnnouncementDraftInput {
  productId?: string | null;
  relatedReleaseId?: string | null;
  /** When false, do not auto-bind related_release_id from software_update CTA (clone path). */
  bindRelatedRelease?: boolean;
  severity?: AnnouncementSeverity;
  type?: AnnouncementType;
  targetPlatform?: ReleasePlatform | null;
  targetArchitecture?: ReleaseArchitecture | null;
  releaseChannel?: ReleaseChannel | null;
  minimumAppVersion?: string | null;
  maximumAppVersion?: string | null;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  ctaKind?: AnnouncementCtaKind;
  ctaPayload?: Record<string, unknown> | null;
  translations: AnnouncementTranslationInput[];
  actorUserId?: string | null;
}

export interface UpdateAnnouncementDraftInput extends CreateAnnouncementDraftInput {
  announcementId: string;
}

export interface DesktopAnnouncementView {
  publicId: string;
  severity: AnnouncementSeverity;
  type: AnnouncementType;
  title: string;
  body: string | null;
  ctaLabel: string | null;
  ctaKind: AnnouncementCtaKind;
  ctaPayload: Record<string, unknown> | null;
  publishedAt: Date | null;
  expiresAt: Date | null;
  readAt: Date | null;
  dismissedAt: Date | null;
}

export interface ListDesktopAnnouncementsQuery {
  userId: string;
  productId: string;
  appVersion: string;
  platform: ReleasePlatform;
  architecture: ReleaseArchitecture;
  channel: ReleaseChannel;
  locale: string;
  limit?: number;
  cursor?: string | null;
}

export interface DesktopAnnouncementsPage {
  items: DesktopAnnouncementView[];
  nextCursor: string | null;
}

export interface AnnouncementReceiptRecord {
  announcementId: string;
  userId: string;
  firstDeliveredAt: Date | null;
  readAt: Date | null;
  dismissedAt: Date | null;
}

export interface ListAdminAnnouncementsQuery {
  productId?: string | null;
  status?: AnnouncementStatus | null;
  severity?: AnnouncementSeverity | null;
  platform?: ReleasePlatform | null;
  channel?: ReleaseChannel | null;
  /** Schedule window for published rows; ignored when status filter is set to draft. */
  schedule?: "active" | "expired" | "all" | null;
  page?: number;
  pageSize?: number;
}

export interface AdminAnnouncementListItem {
  id: string;
  publicId: string;
  productId: string | null;
  productLabel: string | null;
  severity: AnnouncementSeverity;
  status: AnnouncementStatus;
  targetPlatform: ReleasePlatform | null;
  targetArchitecture: ReleaseArchitecture | null;
  releaseChannel: ReleaseChannel | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  publishedAt: Date | null;
  titleVi: string | null;
  titleEn: string | null;
  updatedAt: Date;
}
