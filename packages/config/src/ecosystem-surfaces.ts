import { DOMAINS, devUrl, type DevAppKey, type SupportedLocale } from "./domains";
import { getEnv } from "./env";
import type { Env } from "./env";

export type SurfaceVisibility = "PUBLIC" | "DEVELOPER" | "INTERNAL";
export type SurfaceCategory = "core" | "platform" | "tools";
export type SurfaceOpenBehavior = "same-tab" | "new-tab";

export type KhepreeSurfaceId =
  | "marketing"
  | "account"
  | "app"
  | "partner"
  | "api"
  | "download"
  | "status"
  | "admin";

/** Developer docs live on the marketing site — not a separate hostname. */
export type KhepreeNavSurfaceId = KhepreeSurfaceId | "developers";

export interface KhepreeSurfaceDefinition {
  id: KhepreeNavSurfaceId;
  labelVi: string;
  labelEn: string;
  descriptionVi: string;
  descriptionEn: string;
  visibility: SurfaceVisibility;
  category: SurfaceCategory;
  openBehavior: SurfaceOpenBehavior;
  /** Resolved on the marketing origin when set (e.g. /products, /docs). */
  marketingRelativePath?: string;
}

export const KHEPREE_SURFACE_DEFINITIONS: Record<KhepreeNavSurfaceId, KhepreeSurfaceDefinition> = {
  marketing: {
    id: "marketing",
    labelVi: "Sản phẩm",
    labelEn: "Products",
    descriptionVi: "Khám phá phần mềm Khepree.",
    descriptionEn: "Explore Khepree software.",
    visibility: "PUBLIC",
    category: "core",
    openBehavior: "same-tab",
    marketingRelativePath: "/products",
  },
  account: {
    id: "account",
    labelVi: "Tài khoản Khepree",
    labelEn: "Khepree Account",
    descriptionVi: "Quản lý đăng nhập, giấy phép và tải xuống.",
    descriptionEn: "Manage sign-in, licenses, and downloads.",
    visibility: "PUBLIC",
    category: "platform",
    openBehavior: "new-tab",
  },
  app: {
    id: "app",
    labelVi: "Ứng dụng web",
    labelEn: "Web apps",
    descriptionVi: "Truy cập ứng dụng Khepree trên trình duyệt.",
    descriptionEn: "Access Khepree applications in your browser.",
    visibility: "PUBLIC",
    category: "platform",
    openBehavior: "new-tab",
  },
  partner: {
    id: "partner",
    labelVi: "Đối tác & Đại lý",
    labelEn: "Partners & resellers",
    descriptionVi: "Chương trình đối tác và bán lại.",
    descriptionEn: "Partner and reseller programs.",
    visibility: "PUBLIC",
    category: "platform",
    openBehavior: "new-tab",
  },
  download: {
    id: "download",
    labelVi: "Tải phần mềm",
    labelEn: "Download software",
    descriptionVi: "Cài đặt sản phẩm desktop khi bạn có quyền truy cập.",
    descriptionEn: "Install desktop products when you have access.",
    visibility: "PUBLIC",
    category: "tools",
    openBehavior: "new-tab",
  },
  status: {
    id: "status",
    labelVi: "Trạng thái hệ thống",
    labelEn: "System status",
    descriptionVi: "Theo dõi tình trạng dịch vụ Khepree.",
    descriptionEn: "Monitor Khepree service health.",
    visibility: "PUBLIC",
    category: "tools",
    openBehavior: "new-tab",
  },
  developers: {
    id: "developers",
    labelVi: "API / Developers",
    labelEn: "API / Developers",
    descriptionVi: "Tài liệu và hướng dẫn tích hợp.",
    descriptionEn: "Documentation and integration guides.",
    visibility: "DEVELOPER",
    category: "tools",
    openBehavior: "same-tab",
    marketingRelativePath: "/docs",
  },
  api: {
    id: "api",
    labelVi: "Khepree API",
    labelEn: "Khepree API",
    descriptionVi: "HTTP API cho tích hợp và automation.",
    descriptionEn: "HTTP API for integrations and automation.",
    visibility: "DEVELOPER",
    category: "tools",
    openBehavior: "new-tab",
  },
  admin: {
    id: "admin",
    labelVi: "Admin",
    labelEn: "Admin",
    descriptionVi: "Bảng điều khiển nội bộ.",
    descriptionEn: "Internal control center.",
    visibility: "INTERNAL",
    category: "platform",
    openBehavior: "new-tab",
  },
};

export interface ResolvedKhepreeSurface {
  id: KhepreeNavSurfaceId;
  label: string;
  description: string;
  url: string;
  visibility: SurfaceVisibility;
  category: SurfaceCategory;
  openBehavior: SurfaceOpenBehavior;
  external: boolean;
  configured: boolean;
}

type UrlEnvKey = keyof Pick<
  Env,
  "WEB_URL" | "APP_URL" | "ACCOUNT_URL" | "PARTNER_URL" | "API_URL" | "ADMIN_URL" | "STATUS_URL" | "DOWNLOAD_URL"
>;

function trimUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function resolveConfiguredUrl(
  envKey: UrlEnvKey,
  nextPublicKey: string | undefined,
  domain: keyof typeof DOMAINS,
  devApp?: DevAppKey,
  source: Record<string, string | undefined> = process.env,
  optional = false,
): string | null {
  const fromPublic = nextPublicKey ? source[nextPublicKey] : undefined;
  if (fromPublic) return trimUrl(fromPublic);
  const fromEnv = getEnv(source)[envKey];
  if (fromEnv) return trimUrl(fromEnv);
  if (source.NODE_ENV === "development" && devApp) return devUrl(devApp);
  if (optional) return null;
  return `https://${DOMAINS[domain]}`;
}

export function marketingPublicUrl(source: Record<string, string | undefined> = process.env): string {
  const fromPublic = source.NEXT_PUBLIC_WEB_URL;
  if (fromPublic) return trimUrl(fromPublic);
  const fromEnv = getEnv(source).WEB_URL;
  if (fromEnv) return trimUrl(fromEnv);
  if (source.NODE_ENV === "development") return devUrl("web");
  return `https://${DOMAINS.web}`;
}

export function accountPublicUrl(source: Record<string, string | undefined> = process.env): string {
  return resolveConfiguredUrl("ACCOUNT_URL", "NEXT_PUBLIC_ACCOUNT_URL", "account", "account", source)!;
}

export function partnerPublicUrl(source: Record<string, string | undefined> = process.env): string {
  return resolveConfiguredUrl("PARTNER_URL", "NEXT_PUBLIC_PARTNER_URL", "partner", "partner", source)!;
}

export function adminPublicUrl(source: Record<string, string | undefined> = process.env): string {
  return resolveConfiguredUrl("ADMIN_URL", "NEXT_PUBLIC_ADMIN_URL", "admin", "admin", source)!;
}

export function apiPublicUrl(source: Record<string, string | undefined> = process.env): string | null {
  return resolveConfiguredUrl("API_URL", "NEXT_PUBLIC_API_URL", "api", "api", source);
}

/** Separate web-app surface — hidden when unset or same origin as marketing. */
export function appPublicUrl(source: Record<string, string | undefined> = process.env): string | null {
  const app = resolveConfiguredUrl("APP_URL", "NEXT_PUBLIC_APP_URL", "app", undefined, source, true);
  if (!app) return null;
  if (app === marketingPublicUrl(source)) return null;
  return app;
}

export function statusPublicUrl(source: Record<string, string | undefined> = process.env): string | null {
  return resolveConfiguredUrl("STATUS_URL", "NEXT_PUBLIC_STATUS_URL", "web", undefined, source, true);
}

export function downloadPublicUrl(source: Record<string, string | undefined> = process.env): string {
  const dedicated = resolveConfiguredUrl(
    "DOWNLOAD_URL",
    "NEXT_PUBLIC_DOWNLOAD_URL",
    "download",
    undefined,
    source,
    true,
  );
  if (dedicated) return dedicated;
  return `${accountPublicUrl(source)}/downloads`;
}

function surfaceAbsoluteUrl(id: KhepreeSurfaceId, source: Record<string, string | undefined>): string | null {
  switch (id) {
    case "marketing":
      return marketingPublicUrl(source);
    case "account":
      return accountPublicUrl(source);
    case "app":
      return appPublicUrl(source);
    case "partner":
      return partnerPublicUrl(source);
    case "api":
      return apiPublicUrl(source);
    case "download":
      return downloadPublicUrl(source);
    case "status":
      return statusPublicUrl(source);
    case "admin":
      return adminPublicUrl(source);
    default:
      return null;
  }
}

function isSurfaceConfigured(id: KhepreeNavSurfaceId, url: string | null, source: Record<string, string | undefined>): boolean {
  if (id === "marketing" || id === "developers") return true;
  if (id === "account" || id === "partner" || id === "download") return Boolean(url);
  if (id === "app") return Boolean(appPublicUrl(source));
  if (id === "status") return Boolean(statusPublicUrl(source));
  if (id === "api") return Boolean(apiPublicUrl(source));
  if (id === "admin") return Boolean(adminPublicUrl(source));
  return false;
}

export interface ResolveSurfacesOptions {
  locale: SupportedLocale;
  /** Prefix locale on marketing-relative paths, e.g. `/vi/products`. */
  marketingPath?: (path: string) => string;
  source?: Record<string, string | undefined>;
}

function localize(def: KhepreeSurfaceDefinition, locale: SupportedLocale) {
  return {
    label: locale === "vi" ? def.labelVi : def.labelEn,
    description: locale === "vi" ? def.descriptionVi : def.descriptionEn,
  };
}

function resolveSurface(
  id: KhepreeNavSurfaceId,
  options: ResolveSurfacesOptions,
): ResolvedKhepreeSurface | null {
  const source = options.source ?? process.env;
  const def = KHEPREE_SURFACE_DEFINITIONS[id];
  const copy = localize(def, options.locale);

  if (def.marketingRelativePath) {
    const path = options.marketingPath?.(def.marketingRelativePath) ?? def.marketingRelativePath;
    return {
      id,
      ...copy,
      url: path,
      visibility: def.visibility,
      category: def.category,
      openBehavior: def.openBehavior,
      external: false,
      configured: true,
    };
  }

  const absolute = surfaceAbsoluteUrl(id as KhepreeSurfaceId, source);
  const configured = isSurfaceConfigured(id, absolute, source);
  if (!configured || !absolute) return null;

  return {
    id,
    ...copy,
    url: absolute,
    visibility: def.visibility,
    category: def.category,
    openBehavior: def.openBehavior,
    external: def.openBehavior === "new-tab",
    configured: true,
  };
}

/** Header / launcher — PUBLIC + DEVELOPER, configured only. Never INTERNAL. */
export function listEcosystemNavSurfaces(options: ResolveSurfacesOptions): ResolvedKhepreeSurface[] {
  const ids: KhepreeNavSurfaceId[] = [
    "marketing",
    "account",
    "app",
    "partner",
    "download",
    "status",
    "developers",
    "api",
  ];
  return ids
    .map((id) => resolveSurface(id, options))
    .filter((surface): surface is ResolvedKhepreeSurface => surface !== null)
    .filter((surface) => surface.visibility !== "INTERNAL");
}

/** Footer ecosystem column — PUBLIC platform/tools only. */
export function listEcosystemFooterSurfaces(options: ResolveSurfacesOptions): ResolvedKhepreeSurface[] {
  const ids: KhepreeSurfaceId[] = ["account", "app", "partner", "download", "status"];
  return ids
    .map((id) => resolveSurface(id, options))
    .filter((surface): surface is ResolvedKhepreeSurface => surface !== null);
}

/** Homepage network — PUBLIC surfaces plus developers. */
export function listEcosystemNetworkSurfaces(options: ResolveSurfacesOptions): ResolvedKhepreeSurface[] {
  const ids: KhepreeNavSurfaceId[] = ["marketing", "account", "app", "partner", "download", "developers"];
  return ids
    .map((id) => resolveSurface(id, options))
    .filter((surface): surface is ResolvedKhepreeSurface => surface !== null)
    .filter((surface) => surface.visibility === "PUBLIC" || surface.id === "developers");
}

/** SEO indexing intent per surface hostname class. */
export const SURFACE_ROBOTS: Record<KhepreeSurfaceId, "index" | "noindex"> = {
  marketing: "index",
  account: "noindex",
  app: "noindex",
  partner: "noindex",
  api: "noindex",
  download: "noindex",
  status: "noindex",
  admin: "noindex",
};
