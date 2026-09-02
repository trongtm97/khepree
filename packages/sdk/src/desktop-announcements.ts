export const DESKTOP_ANNOUNCEMENT_SEVERITIES = [
  "info",
  "success",
  "warning",
  "error",
  "action_required",
] as const;

export type DesktopAnnouncementSeverity = (typeof DESKTOP_ANNOUNCEMENT_SEVERITIES)[number];

export const DESKTOP_ANNOUNCEMENT_CTA_KINDS = ["none", "open_url", "open_path"] as const;

export type DesktopAnnouncementCtaKind = (typeof DESKTOP_ANNOUNCEMENT_CTA_KINDS)[number];

export interface DesktopAnnouncementCta {
  kind: DesktopAnnouncementCtaKind;
  payload: Record<string, unknown> | null;
}

export interface DesktopAnnouncementItem {
  publicId: string;
  severity: DesktopAnnouncementSeverity;
  title: string;
  body: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  cta: DesktopAnnouncementCta;
  readAt: string | null;
  dismissedAt: string | null;
}

export interface DesktopAnnouncementsResponse {
  items: DesktopAnnouncementItem[];
  nextCursor: string | null;
}

export interface DesktopAnnouncementReadResponse {
  publicId: string;
  readAt: string;
}

export interface DesktopAnnouncementDismissResponse {
  publicId: string;
  dismissedAt: string;
  readAt: string | null;
}
