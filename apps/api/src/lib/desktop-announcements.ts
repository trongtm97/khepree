import { DEFAULT_LOCALE, isSupportedLocale } from "@khepree/config";
import type {
  DesktopAnnouncementView,
  DesktopAnnouncementsPage,
} from "@khepree/catalog";
import type {
  AnnouncementCtaKind,
  AnnouncementSeverity,
  ReleaseArchitecture,
  ReleaseChannel,
  ReleasePlatform,
} from "@khepree/db";
import type { DesktopAnnouncementItem, DesktopAnnouncementsResponse } from "@khepree/sdk";

const PLATFORMS = new Set<ReleasePlatform>(["windows", "macos", "linux"]);
const ARCHITECTURES = new Set<ReleaseArchitecture>(["x64", "arm64", "universal"]);
const CHANNELS = new Set<ReleaseChannel>(["stable", "beta", "alpha"]);

export interface ParsedDesktopAnnouncementsQuery {
  clientId: string;
  appVersion: string;
  platform: ReleasePlatform;
  architecture: ReleaseArchitecture;
  channel: ReleaseChannel;
  locale: string;
  limit?: number;
  cursor?: string | null;
}

export type DesktopAnnouncementsQueryError =
  | "CLIENT_ID_REQUIRED"
  | "APP_VERSION_REQUIRED"
  | "PLATFORM_INVALID"
  | "ARCHITECTURE_INVALID"
  | "CHANNEL_INVALID"
  | "LIMIT_INVALID";

export function parseDesktopAnnouncementsQuery(
  params: URLSearchParams,
): ParsedDesktopAnnouncementsQuery | DesktopAnnouncementsQueryError {
  const clientId = params.get("clientId")?.trim() ?? "";
  if (!clientId) return "CLIENT_ID_REQUIRED";

  const appVersion = params.get("appVersion")?.trim() ?? "";
  if (!appVersion) return "APP_VERSION_REQUIRED";

  const platform = params.get("platform")?.trim() as ReleasePlatform;
  if (!PLATFORMS.has(platform)) return "PLATFORM_INVALID";

  const architecture = params.get("architecture")?.trim() as ReleaseArchitecture;
  if (!ARCHITECTURES.has(architecture)) return "ARCHITECTURE_INVALID";

  const channel = (params.get("channel")?.trim() || "stable") as ReleaseChannel;
  if (!CHANNELS.has(channel)) return "CHANNEL_INVALID";

  const localeParam = params.get("locale");
  const locale = isSupportedLocale(localeParam) ? localeParam : DEFAULT_LOCALE;

  const limitRaw = params.get("limit");
  if (limitRaw != null && limitRaw.trim() !== "") {
    const limit = Number(limitRaw);
    if (!Number.isFinite(limit) || limit < 1) return "LIMIT_INVALID";
  }

  const cursor = params.get("cursor");

  return {
    clientId,
    appVersion,
    platform,
    architecture,
    channel,
    locale,
    limit: limitRaw ? Number(limitRaw) : undefined,
    cursor,
  };
}

export function serializeDesktopAnnouncement(item: DesktopAnnouncementView): DesktopAnnouncementItem {
  return {
    publicId: item.publicId,
    severity: item.severity as AnnouncementSeverity,
    type: item.type,
    title: item.title,
    body: item.body,
    ctaLabel: item.ctaLabel ?? null,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    expiresAt: item.expiresAt?.toISOString() ?? null,
    cta: {
      kind: item.ctaKind as AnnouncementCtaKind,
      payload: item.ctaPayload,
    },
    readAt: item.readAt?.toISOString() ?? null,
    dismissedAt: item.dismissedAt?.toISOString() ?? null,
  };
}

export function serializeDesktopAnnouncementsPage(
  page: DesktopAnnouncementsPage,
): DesktopAnnouncementsResponse {
  return {
    items: page.items.map(serializeDesktopAnnouncement),
    nextCursor: page.nextCursor,
  };
}

export function desktopAnnouncementsQueryErrorMessage(code: DesktopAnnouncementsQueryError): string {
  switch (code) {
    case "CLIENT_ID_REQUIRED":
      return "clientId query parameter is required";
    case "APP_VERSION_REQUIRED":
      return "appVersion query parameter is required";
    case "PLATFORM_INVALID":
      return "platform must be windows, macos, or linux";
    case "ARCHITECTURE_INVALID":
      return "architecture must be x64, arm64, or universal";
    case "CHANNEL_INVALID":
      return "channel must be stable, beta, or alpha";
    case "LIMIT_INVALID":
      return "limit must be a positive integer";
  }
}
