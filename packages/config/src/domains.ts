/** Production domain map — development uses localhost ports. */
export const DOMAINS = {
  web: "khepree.com",
  account: "account.khepree.com",
  app: "app.khepree.com",
  partner: "partner.khepree.com",
  admin: "admin.khepree.com",
  api: "api.khepree.com",
  cdn: "cdn.khepree.com",
  download: "download.khepree.com",
} as const;

export type DomainKey = keyof typeof DOMAINS;

/** Local development ports per app surface. */
export const DEV_PORTS = {
  web: 3000,
  account: 3001,
  admin: 3002,
  partner: 3003,
  api: 3004,
} as const;

export type DevAppKey = keyof typeof DEV_PORTS;

export function devUrl(app: DevAppKey): string {
  return `http://localhost:${DEV_PORTS[app]}`;
}

export const BRAND = {
  name: "Khepree",
  tagline: "Software that moves you forward.",
  promise: "Useful software. Real value.",
  philosophy: "Built to create value.",
} as const;

export const SUPPORTED_LOCALES = ["en", "vi"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "en";
