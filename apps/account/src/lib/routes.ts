export const AUTH_ROUTES = {
  signIn: "/sign-in",
  signUp: "/sign-up",
  verifyEmail: "/verify-email",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
} as const;

export const PROTECTED_ROUTES = {
  dashboard: "/dashboard",
  profile: "/profile",
  security: "/security",
  sessions: "/sessions",
  products: "/products",
  licenses: "/licenses",
  devices: "/devices",
  billing: "/billing",
  downloads: "/downloads",
  checkout: "/checkout",
} as const;

export const ACCOUNT_NAV = [
  { label: "Tổng quan", href: PROTECTED_ROUTES.dashboard },
  { label: "Sản phẩm", href: PROTECTED_ROUTES.products },
  { label: "Giấy phép", href: PROTECTED_ROUTES.licenses },
  { label: "Thiết bị", href: PROTECTED_ROUTES.devices },
  { label: "Thanh toán", href: PROTECTED_ROUTES.billing },
  { label: "Tải xuống", href: PROTECTED_ROUTES.downloads },
  { label: "Hồ sơ", href: PROTECTED_ROUTES.profile },
  { label: "Bảo mật", href: PROTECTED_ROUTES.security },
] as const;

export const PUBLIC_AUTH_PATHS = Object.values(AUTH_ROUTES);
export const PROTECTED_PATHS = Object.values(PROTECTED_ROUTES);

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
