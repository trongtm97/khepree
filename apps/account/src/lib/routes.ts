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
  { label: "Dashboard", href: PROTECTED_ROUTES.dashboard },
  { label: "Products", href: PROTECTED_ROUTES.products },
  { label: "Licenses", href: PROTECTED_ROUTES.licenses },
  { label: "Devices", href: PROTECTED_ROUTES.devices },
  { label: "Billing", href: PROTECTED_ROUTES.billing },
  { label: "Downloads", href: PROTECTED_ROUTES.downloads },
  { label: "Profile", href: PROTECTED_ROUTES.profile },
  { label: "Security", href: PROTECTED_ROUTES.security },
] as const;

export const PUBLIC_AUTH_PATHS = Object.values(AUTH_ROUTES);
export const PROTECTED_PATHS = Object.values(PROTECTED_ROUTES);

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
