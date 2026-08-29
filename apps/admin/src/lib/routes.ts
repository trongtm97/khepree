import type { Permission } from "@khepree/security";

export const AUTH_ROUTES = {
  signIn: "/sign-in",
} as const;

export const ADMIN_NAV: Array<{ label: string; href: string; anyOf: Permission[] }> = [
  { label: "Dashboard", href: "/dashboard", anyOf: ["admin.access"] },
  { label: "Users", href: "/users", anyOf: ["admin.users.read"] },
  { label: "Organizations", href: "/organizations", anyOf: ["admin.users.read"] },
  { label: "Products", href: "/products", anyOf: ["catalog.read"] },
  { label: "Plans", href: "/plans", anyOf: ["catalog.read"] },
  { label: "Features", href: "/features", anyOf: ["catalog.read"] },
  { label: "Prices", href: "/prices", anyOf: ["catalog.read"] },
  { label: "Orders", href: "/orders", anyOf: ["finance.read", "support.read"] },
  { label: "Payments", href: "/payments", anyOf: ["finance.read"] },
  { label: "Subscriptions", href: "/subscriptions", anyOf: ["finance.read"] },
  { label: "Entitlements", href: "/entitlements", anyOf: ["entitlement.read"] },
  { label: "Licenses", href: "/licenses", anyOf: ["entitlement.read"] },
  { label: "Devices", href: "/devices", anyOf: ["entitlement.read"] },
  { label: "Partners", href: "/partners", anyOf: ["partner.admin", "support.read", "finance.read"] },
  { label: "Commissions", href: "/commissions", anyOf: ["finance.read"] },
  { label: "Content", href: "/content", anyOf: ["content.read"] },
  { label: "Media", href: "/media", anyOf: ["content.read"] },
  { label: "Releases", href: "/releases", anyOf: ["content.read"] },
  { label: "Downloads", href: "/downloads", anyOf: ["content.read"] },
  { label: "Audit Logs", href: "/audit", anyOf: ["support.read", "finance.read"] },
  { label: "System", href: "/system", anyOf: ["admin.access"] },
];

export const PROTECTED_PATHS = ADMIN_NAV.map((item) => item.href);
export const PUBLIC_AUTH_PATHS = [
  AUTH_ROUTES.signIn,
  "/unauthorized",
  "/forbidden",
  "/mfa-required",
];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
