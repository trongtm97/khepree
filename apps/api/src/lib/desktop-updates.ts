import { DEFAULT_LOCALE, isDesktopPublicUpdateProduct, isSupportedLocale } from "@khepree/config";
import type { DesktopLatestUpdatePayload } from "@khepree/catalog";
import type {
  ReleaseArchitecture,
  ReleaseChannel,
  ReleasePlatform,
} from "@khepree/db";
import type { DesktopLatestUpdateResponse } from "@khepree/sdk";
import type { createKhepreePlatform } from "@khepree/platform";
import type { DesktopClientRecord, DesktopSessionRecord } from "@khepree/desktop-auth";
import { DesktopAuthError } from "@khepree/desktop-auth";

const PLATFORMS = new Set<ReleasePlatform>(["windows", "macos", "linux"]);
const ARCHITECTURES = new Set<ReleaseArchitecture>(["x64", "arm64", "universal"]);
const CHANNELS = new Set<ReleaseChannel>(["stable", "beta", "alpha"]);

export interface ParsedDesktopUpdatesQuery {
  clientId: string;
  currentVersion: string;
  platform: ReleasePlatform;
  architecture: ReleaseArchitecture;
  channel: ReleaseChannel;
  locale: string;
}

export type DesktopUpdatesQueryError =
  | "CLIENT_ID_REQUIRED"
  | "CURRENT_VERSION_REQUIRED"
  | "PLATFORM_INVALID"
  | "ARCHITECTURE_INVALID"
  | "CHANNEL_INVALID";

export function parseDesktopUpdatesQuery(
  params: URLSearchParams,
): ParsedDesktopUpdatesQuery | DesktopUpdatesQueryError {
  const clientId = params.get("clientId")?.trim() ?? "";
  if (!clientId) return "CLIENT_ID_REQUIRED";

  const currentVersion = params.get("currentVersion")?.trim() ?? "";
  if (!currentVersion) return "CURRENT_VERSION_REQUIRED";

  const platform = params.get("platform")?.trim() as ReleasePlatform;
  if (!PLATFORMS.has(platform)) return "PLATFORM_INVALID";

  const architecture = params.get("architecture")?.trim() as ReleaseArchitecture;
  if (!ARCHITECTURES.has(architecture)) return "ARCHITECTURE_INVALID";

  const channel = (params.get("channel")?.trim() || "stable") as ReleaseChannel;
  if (!CHANNELS.has(channel)) return "CHANNEL_INVALID";

  const localeParam = params.get("locale");
  const locale = isSupportedLocale(localeParam) ? localeParam : DEFAULT_LOCALE;

  return { clientId, currentVersion, platform, architecture, channel, locale };
}

export function desktopUpdatesQueryErrorMessage(code: DesktopUpdatesQueryError): string {
  switch (code) {
    case "CLIENT_ID_REQUIRED":
      return "clientId query parameter is required";
    case "CURRENT_VERSION_REQUIRED":
      return "currentVersion query parameter is required";
    case "PLATFORM_INVALID":
      return "platform must be windows, macos, or linux";
    case "ARCHITECTURE_INVALID":
      return "architecture must be x64, arm64, or universal";
    case "CHANNEL_INVALID":
      return "channel must be stable, beta, or alpha";
  }
}

export function serializeDesktopLatestUpdateResponse(
  update: DesktopLatestUpdatePayload | null,
): DesktopLatestUpdateResponse {
  return { update };
}

export interface DesktopUpdateDownloadBody {
  clientId: string;
  releasePublicId: string;
  artifactPublicId: string;
}

export type DesktopUpdateDownloadBodyError =
  | "CLIENT_ID_REQUIRED"
  | "RELEASE_PUBLIC_ID_REQUIRED"
  | "ARTIFACT_PUBLIC_ID_REQUIRED";

export function parseDesktopUpdateDownloadBody(
  body: Record<string, unknown>,
): DesktopUpdateDownloadBody | DesktopUpdateDownloadBodyError {
  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  if (!clientId) return "CLIENT_ID_REQUIRED";

  const releasePublicId =
    typeof body.releasePublicId === "string" ? body.releasePublicId.trim() : "";
  if (!releasePublicId) return "RELEASE_PUBLIC_ID_REQUIRED";

  const artifactPublicId =
    typeof body.artifactPublicId === "string" ? body.artifactPublicId.trim() : "";
  if (!artifactPublicId) return "ARTIFACT_PUBLIC_ID_REQUIRED";

  return { clientId, releasePublicId, artifactPublicId };
}

export function desktopUpdateDownloadBodyErrorMessage(
  code: DesktopUpdateDownloadBodyError,
): string {
  switch (code) {
    case "CLIENT_ID_REQUIRED":
      return "clientId is required";
    case "RELEASE_PUBLIC_ID_REQUIRED":
      return "releasePublicId is required";
    case "ARTIFACT_PUBLIC_ID_REQUIRED":
      return "artifactPublicId is required";
  }
}

type Platform = ReturnType<typeof createKhepreePlatform>;

export interface DesktopUpdateAccess {
  entitled: boolean;
  publicUpdateAuthorized: boolean;
  canAccessUpdates: boolean;
}

export async function resolveDesktopUpdateAccess(
  platform: Platform,
  session: DesktopSessionRecord,
  productId: string,
): Promise<DesktopUpdateAccess> {
  const publicUpdateAuthorized = isDesktopPublicUpdateProduct(productId);
  const entitled = await platform.entitlement.canUseProduct(
    { type: "USER", id: session.userId },
    productId,
  );
  return {
    entitled,
    publicUpdateAuthorized,
    canAccessUpdates: entitled || publicUpdateAuthorized,
  };
}

export function buildReleaseDownloadContext(input: {
  access: DesktopUpdateAccess;
  actorUserId: string;
}): {
  purpose: string;
  actorUserId: string;
  entitled?: boolean;
  publicUpdateAuthorized?: boolean;
} {
  return {
    purpose: "desktop_release_download",
    actorUserId: input.actorUserId,
    ...(input.access.entitled ? { entitled: true } : {}),
    ...(input.access.publicUpdateAuthorized && !input.access.entitled
      ? { publicUpdateAuthorized: true }
      : {}),
  };
}

export function assertReleaseMatchesClientProduct(
  releaseProductId: string,
  client: DesktopClientRecord,
): void {
  if (releaseProductId !== client.productId) {
    throw new DesktopAuthError("PRODUCT_NOT_ALLOWED", "Release does not belong to this client");
  }
}
