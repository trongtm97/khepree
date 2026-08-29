import type { FeatureKey, GlobalRole, OrgRole, PartnerRole } from "@khepree/types";

export type Permission =
  | "admin.access"
  | "admin.users.read"
  | "admin.users.write"
  | "finance.read"
  | "finance.write"
  | "support.read"
  | "partner.access"
  | "partner.manage"
  | "org.manage"
  | "org.billing"
  | `feature.${FeatureKey}`;

const GLOBAL_ROLE_PERMISSIONS: Record<GlobalRole, readonly Permission[]> = {
  USER: [],
  SUPPORT: ["support.read", "admin.access"],
  FINANCE: ["finance.read", "finance.write", "admin.access"],
  ADMIN: [
    "admin.access",
    "admin.users.read",
    "admin.users.write",
    "finance.read",
    "support.read",
  ],
  SUPER_ADMIN: [
    "admin.access",
    "admin.users.read",
    "admin.users.write",
    "finance.read",
    "finance.write",
    "support.read",
  ],
};

const ORG_ROLE_PERMISSIONS: Record<OrgRole, readonly Permission[]> = {
  OWNER: ["org.manage", "org.billing"],
  ADMIN: ["org.manage"],
  MEMBER: [],
};

const PARTNER_ROLE_PERMISSIONS: Record<PartnerRole, readonly Permission[]> = {
  PARTNER_OWNER: ["partner.access", "partner.manage"],
  PARTNER_MANAGER: ["partner.access", "partner.manage"],
  PARTNER_SALES: ["partner.access"],
};

export interface PermissionContext {
  globalRole?: GlobalRole;
  orgRole?: OrgRole;
  partnerRole?: PartnerRole;
  features?: Partial<Record<FeatureKey, boolean | number>>;
}

export function permissionsForContext(ctx: PermissionContext): Set<Permission> {
  const set = new Set<Permission>();

  if (ctx.globalRole) {
    for (const p of GLOBAL_ROLE_PERMISSIONS[ctx.globalRole]) set.add(p);
  }
  if (ctx.orgRole) {
    for (const p of ORG_ROLE_PERMISSIONS[ctx.orgRole]) set.add(p);
  }
  if (ctx.partnerRole) {
    for (const p of PARTNER_ROLE_PERMISSIONS[ctx.partnerRole]) set.add(p);
  }
  if (ctx.features) {
    for (const [key, value] of Object.entries(ctx.features)) {
      if (value) set.add(`feature.${key as FeatureKey}`);
    }
  }

  return set;
}

export function hasPermission(ctx: PermissionContext, permission: Permission): boolean {
  return permissionsForContext(ctx).has(permission);
}

export function hasFeature(ctx: PermissionContext, feature: FeatureKey): boolean {
  return hasPermission(ctx, `feature.${feature}`);
}

export {
  GLOBAL_ROLE_PERMISSIONS,
  ORG_ROLE_PERMISSIONS,
  PARTNER_ROLE_PERMISSIONS,
};
