export type LegalPageId = "privacy" | "terms" | "refund" | "eula" | "cookies";

export type LegalPageStatus = "draft" | "published";

export interface LegalPageMeta {
  id: LegalPageId;
  path: `/${LegalPageId}` | "/privacy" | "/terms" | "/refund" | "/eula" | "/cookies";
  version: string;
  effectiveDate: string;
  publishedAt: string;
  status: LegalPageStatus;
  /** Internal CMS marker — never render to visitors. */
  legalReviewRequired?: boolean;
}

/** Align with auth consent bumps when terms/privacy change materially. */
const LEGAL_VERSION = "2026-08-31";

const REGISTRY: Record<LegalPageId, LegalPageMeta> = {
  privacy: {
    id: "privacy",
    path: "/privacy",
    version: LEGAL_VERSION,
    effectiveDate: "2026-08-31",
    publishedAt: "2026-08-31T00:00:00.000Z",
    status: "published",
    legalReviewRequired: true,
  },
  terms: {
    id: "terms",
    path: "/terms",
    version: LEGAL_VERSION,
    effectiveDate: "2026-08-31",
    publishedAt: "2026-08-31T00:00:00.000Z",
    status: "published",
    legalReviewRequired: true,
  },
  refund: {
    id: "refund",
    path: "/refund",
    version: LEGAL_VERSION,
    effectiveDate: "2026-08-31",
    publishedAt: "2026-08-31T00:00:00.000Z",
    status: "published",
    legalReviewRequired: true,
  },
  eula: {
    id: "eula",
    path: "/eula",
    version: LEGAL_VERSION,
    effectiveDate: "2026-08-31",
    publishedAt: "2026-08-31T00:00:00.000Z",
    status: "published",
    legalReviewRequired: true,
  },
  cookies: {
    id: "cookies",
    path: "/cookies",
    version: LEGAL_VERSION,
    effectiveDate: "2026-08-31",
    publishedAt: "2026-08-31T00:00:00.000Z",
    status: "published",
    legalReviewRequired: true,
  },
};

export function getLegalPageMeta(id: LegalPageId): LegalPageMeta {
  return REGISTRY[id];
}

export function listLegalPageMeta(): LegalPageMeta[] {
  return Object.values(REGISTRY);
}

/** Public routes only when version, effective date, and published status are set. */
export function canPublishLegalPage(meta: LegalPageMeta): boolean {
  if (meta.status !== "published") return false;
  if (!meta.version.trim()) return false;
  if (!meta.effectiveDate.trim()) return false;
  if (!meta.publishedAt.trim()) return false;
  return true;
}

export function publishedLegalPaths(): string[] {
  return listLegalPageMeta()
    .filter(canPublishLegalPage)
    .map((meta) => meta.path);
}
