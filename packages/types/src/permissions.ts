/** Global platform roles */
export const GLOBAL_ROLES = [
  "USER",
  "SUPPORT",
  "FINANCE",
  "ADMIN",
  "SUPER_ADMIN",
] as const;
export type GlobalRole = (typeof GLOBAL_ROLES)[number];

/** Organization membership roles */
export const ORG_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

/** Partner portal roles */
export const PARTNER_ROLES = ["PARTNER_OWNER", "PARTNER_MANAGER", "PARTNER_SALES"] as const;
export type PartnerRole = (typeof PARTNER_ROLES)[number];

/** Feature keys — entitlement checks use these, never plan name strings. */
export const FEATURE_KEYS = [
  "translation.basic",
  "translation.ai",
  "translation.batch",
  "cloud.sync",
  "export.srt",
  "devices.max",
  "projects.max",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type EntitlementSource =
  | "trial"
  | "subscription"
  | "perpetual"
  | "complimentary"
  | "reseller"
  | "admin_grant";

export type EntitlementSubjectType = "user" | "organization";

export type CurrencyCode = string;

export type { MoneyAmount, MoneyMinor } from "./money";

export type IntegrationStatus = "configured" | "not_configured" | "mock";
