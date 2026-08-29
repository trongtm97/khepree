export const AUTH_ROUTES = {
  signIn: "/sign-in",
} as const;

export const PROTECTED_ROUTES = {
  dashboard: "/dashboard",
  customers: "/customers",
  licenses: "/licenses",
  products: "/products",
  orders: "/orders",
  wallet: "/wallet",
  commissions: "/commissions",
  referrals: "/referrals",
  team: "/team",
  settings: "/settings",
} as const;

export const PARTNER_NAV = [
  { label: "Dashboard", href: PROTECTED_ROUTES.dashboard },
  { label: "Customers", href: PROTECTED_ROUTES.customers },
  { label: "Licenses", href: PROTECTED_ROUTES.licenses },
  { label: "Products", href: PROTECTED_ROUTES.products },
  { label: "Orders", href: PROTECTED_ROUTES.orders },
  { label: "Wallet", href: PROTECTED_ROUTES.wallet },
  { label: "Commissions", href: PROTECTED_ROUTES.commissions },
  { label: "Referrals", href: PROTECTED_ROUTES.referrals },
  { label: "Team", href: PROTECTED_ROUTES.team },
  { label: "Settings", href: PROTECTED_ROUTES.settings },
] as const;

export const PUBLIC_AUTH_PATHS = Object.values(AUTH_ROUTES);
export const PROTECTED_PATHS = Object.values(PROTECTED_ROUTES);

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
