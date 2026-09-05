import type {
  AnnouncementCtaKind,
  AnnouncementSeverity,
  AnnouncementType,
  ReleaseArchitecture,
  ReleaseChannel,
  ReleasePlatform,
} from "@khepree/db";
import { validateAnnouncementCta } from "./cta-policy";
import type { AnnouncementTranslationInput, CreateAnnouncementDraftInput } from "./types";
import { sanitizeAnnouncementBody } from "./body";

const SEVERITIES = new Set<AnnouncementSeverity>([
  "info",
  "success",
  "warning",
  "error",
  "action_required",
]);
const PLATFORMS = new Set<ReleasePlatform>(["windows", "macos", "linux"]);
const ARCHITECTURES = new Set<ReleaseArchitecture>(["x64", "arm64", "universal"]);
const CHANNELS = new Set<ReleaseChannel>(["stable", "beta", "alpha"]);
const CTA_KINDS = new Set<AnnouncementCtaKind>([
  "none",
  "open_url",
  "open_path",
  "software_update",
]);
const ANNOUNCEMENT_TYPES = new Set<AnnouncementType>(["general", "whats_new", "urgent"]);

function optionalEnum<T extends string>(value: string, allowed: Set<T>): T | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return allowed.has(trimmed as T) ? (trimmed as T) : null;
}

/** Parse datetime-local input as UTC (label must say UTC). */
export function parseUtcDateTimeLocal(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(`${trimmed}:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Thời gian không hợp lệ (UTC)");
  }
  return parsed;
}

export function formatUtcDateTimeLocal(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toISOString().slice(0, 16);
}

export interface AnnouncementDraftFormInput {
  productId?: string | null;
  severity?: string;
  type?: string;
  targetPlatform?: string;
  targetArchitecture?: string;
  releaseChannel?: string;
  minimumAppVersion?: string;
  maximumAppVersion?: string;
  startsAt?: string;
  expiresAt?: string;
  ctaKind?: string;
  ctaUrl?: string;
  ctaPath?: string;
  ctaReleasePublicId?: string;
  titleVi?: string;
  titleEn?: string;
  bodyVi?: string;
  bodyEn?: string;
  ctaLabelVi?: string;
  ctaLabelEn?: string;
}

export function parseAnnouncementDraftForm(
  input: AnnouncementDraftFormInput,
): CreateAnnouncementDraftInput {
  const severity = optionalEnum(input.severity ?? "info", SEVERITIES) ?? "info";
  const type = optionalEnum(input.type ?? "general", ANNOUNCEMENT_TYPES) ?? "general";
  const ctaKind = optionalEnum(input.ctaKind ?? "none", CTA_KINDS) ?? "none";

  let ctaPayload: Record<string, unknown> | null = null;
  if (ctaKind === "open_url") {
    const validated = validateAnnouncementCta(ctaKind, { url: input.ctaUrl ?? "" });
    ctaPayload = validated ? { ...validated } : null;
  } else if (ctaKind === "open_path") {
    const validated = validateAnnouncementCta(ctaKind, { path: input.ctaPath ?? "" });
    ctaPayload = validated ? { ...validated } : null;
  } else if (ctaKind === "software_update") {
    const validated = validateAnnouncementCta(ctaKind, {
      releasePublicId: input.ctaReleasePublicId ?? "",
      actions: ["download", "auto_update"],
    });
    ctaPayload = validated ? { ...validated } : null;
  } else {
    validateAnnouncementCta("none", null);
  }

  const translations: AnnouncementTranslationInput[] = [];
  const titleVi = String(input.titleVi ?? "").trim();
  const titleEn = String(input.titleEn ?? "").trim();
  if (titleVi) {
    translations.push({
      locale: "vi",
      title: titleVi,
      body: sanitizeAnnouncementBody(input.bodyVi),
      ctaLabel: String(input.ctaLabelVi ?? "").trim() || null,
    });
  }
  if (titleEn) {
    translations.push({
      locale: "en",
      title: titleEn,
      body: sanitizeAnnouncementBody(input.bodyEn),
      ctaLabel: String(input.ctaLabelEn ?? "").trim() || null,
    });
  }

  const productId = String(input.productId ?? "").trim() || null;
  const platform = optionalEnum(input.targetPlatform ?? "", PLATFORMS);
  const architecture = optionalEnum(input.targetArchitecture ?? "", ARCHITECTURES);
  const channel = optionalEnum(input.releaseChannel ?? "", CHANNELS);

  return {
    productId,
    severity,
    type,
    targetPlatform: platform,
    targetArchitecture: architecture,
    releaseChannel: channel,
    minimumAppVersion: String(input.minimumAppVersion ?? "").trim() || null,
    maximumAppVersion: String(input.maximumAppVersion ?? "").trim() || null,
    startsAt: parseUtcDateTimeLocal(String(input.startsAt ?? "")),
    expiresAt: parseUtcDateTimeLocal(String(input.expiresAt ?? "")),
    ctaKind,
    ctaPayload,
    translations,
  };
}

export function buildAnnouncementTargetingSummary(input: {
  productLabel?: string | null;
  targetPlatform?: ReleasePlatform | null;
  targetArchitecture?: ReleaseArchitecture | null;
  releaseChannel?: ReleaseChannel | null;
  minimumAppVersion?: string | null;
  maximumAppVersion?: string | null;
  startsAt?: Date | null;
  expiresAt?: Date | null;
}): string[] {
  const lines: string[] = [];
  lines.push(input.productLabel ? `Sản phẩm: ${input.productLabel}` : "Sản phẩm: toàn hệ sinh thái");
  if (input.targetPlatform) lines.push(`Nền tảng: ${input.targetPlatform}`);
  if (input.targetArchitecture) lines.push(`Kiến trúc: ${input.targetArchitecture}`);
  if (input.releaseChannel) lines.push(`Kênh: ${input.releaseChannel}`);
  if (input.minimumAppVersion) lines.push(`Phiên bản tối thiểu: ${input.minimumAppVersion}`);
  if (input.maximumAppVersion) lines.push(`Phiên bản tối đa: ${input.maximumAppVersion}`);
  if (input.startsAt) lines.push(`Bắt đầu (UTC): ${input.startsAt.toISOString()}`);
  if (input.expiresAt) lines.push(`Kết thúc (UTC): ${input.expiresAt.toISOString()}`);
  if (lines.length === 1) lines.push("Không giới hạn nền tảng/kênh/phiên bản");
  return lines;
}
