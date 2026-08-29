import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { requireDb, type Database } from "../client";
import {
  activations,
  auditLogs,
  commissions,
  contentEntries,
  contentVersions,
  customers,
  devices,
  entitlements,
  features,
  licenses,
  mediaAssets,
  memberships,
  orderItems,
  orders,
  organizations,
  partnerTiers,
  partners,
  payments,
  plans,
  prices,
  products,
  session,
  subscriptions,
  systemEvents,
  user,
  userProfiles,
  wallets,
} from "../schema";

export const ADMIN_PAGE_SIZE = 50;

export function adminOffset(page: number): number {
  const n = Number.isFinite(page) ? Math.trunc(page) : 1;
  return Math.max(0, n - 1) * ADMIN_PAGE_SIZE;
}

export interface AdminDashboard {
  userCount: number;
  activeEntitlementCount: number;
  orderCount: number;
  succeededPaymentCount: number;
  revenueMinorByCurrency: Array<{ currency: string; amountMinor: bigint }>;
  licenseCount: number;
  partnerCount: number;
  recentSystemEvents: Array<{
    id: string;
    eventType: string;
    severity: string;
    createdAt: Date;
  }>;
  recentAudit: Array<{
    id: string;
    action: string;
    resourceType: string;
    resourceId: string | null;
    actorUserId: string | null;
    ipAddress: string | null;
    createdAt: Date;
  }>;
}

function asCount(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  return 0;
}

export async function getAdminDashboard(db: Database = requireDb()): Promise<AdminDashboard> {
  const [
    userRows,
    entitlementRows,
    orderRows,
    paymentRows,
    revenueRows,
    licenseRows,
    partnerRows,
    events,
    audit,
  ] = await Promise.all([
    db.select({ n: count() }).from(user),
    db
      .select({ n: count() })
      .from(entitlements)
      .where(eq(entitlements.status, "active")),
    db.select({ n: count() }).from(orders),
    db
      .select({ n: count() })
      .from(payments)
      .where(eq(payments.status, "succeeded")),
    db
      .select({
        currency: payments.currency,
        amountMinor: sql<string>`coalesce(sum(${payments.amountMinor}), 0)`,
      })
      .from(payments)
      .where(eq(payments.status, "succeeded"))
      .groupBy(payments.currency),
    db.select({ n: count() }).from(licenses),
    db.select({ n: count() }).from(partners),
    db.select().from(systemEvents).orderBy(desc(systemEvents.createdAt)).limit(8),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(8),
  ]);

  return {
    userCount: asCount(userRows[0]?.n),
    activeEntitlementCount: asCount(entitlementRows[0]?.n),
    orderCount: asCount(orderRows[0]?.n),
    succeededPaymentCount: asCount(paymentRows[0]?.n),
    revenueMinorByCurrency: revenueRows.map((row) => ({
      currency: row.currency,
      amountMinor: BigInt(row.amountMinor),
    })),
    licenseCount: asCount(licenseRows[0]?.n),
    partnerCount: asCount(partnerRows[0]?.n),
    recentSystemEvents: events.map((row) => ({
      id: row.id,
      eventType: row.eventType,
      severity: row.severity,
      createdAt: row.createdAt,
    })),
    recentAudit: audit.map((row) => ({
      id: row.id,
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      actorUserId: row.actorUserId,
      ipAddress: row.ipAddress,
      createdAt: row.createdAt,
    })),
  };
}

export async function listAdminUsers(
  input: { q?: string; role?: string; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const filters: SQL[] = [];
  if (input.q?.trim()) {
    const term = `%${input.q.trim()}%`;
    const match = or(ilike(user.email, term), ilike(user.name, term));
    if (match) filters.push(match);
  }
  if (input.role) {
    filters.push(eq(userProfiles.globalRole, input.role as typeof userProfiles.$inferSelect.globalRole));
  }
  const where = filters.length ? and(...filters) : undefined;
  const rows = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      globalRole: userProfiles.globalRole,
      suspendedAt: userProfiles.suspendedAt,
    })
    .from(user)
    .leftJoin(userProfiles, eq(userProfiles.userId, user.id))
    .where(where)
    .orderBy(desc(user.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
  return rows.map((row) => ({
    ...row,
    globalRole: row.globalRole ?? ("USER" as const),
  }));
}

export async function getAdminUser(userId: string, db: Database = requireDb()) {
  const [row] = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      globalRole: userProfiles.globalRole,
      locale: userProfiles.locale,
      suspendedAt: userProfiles.suspendedAt,
    })
    .from(user)
    .leftJoin(userProfiles, eq(userProfiles.userId, user.id))
    .where(eq(user.id, userId))
    .limit(1);
  if (!row) return null;
  const orgRows = await db
    .select({
      organizationId: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, userId));
  const sessionRows = await db
    .select({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    })
    .from(session)
    .where(eq(session.userId, userId))
    .orderBy(desc(session.createdAt));
  const audit = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.actorUserId, userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);
  return {
    ...row,
    globalRole: row.globalRole ?? ("USER" as const),
    organizations: orgRows,
    sessions: sessionRows,
    audit: audit.map((item) => ({
      id: item.id,
      action: item.action,
      resourceType: item.resourceType,
      resourceId: item.resourceId,
      ipAddress: item.ipAddress,
      metadata: item.metadata,
      createdAt: item.createdAt,
    })),
  };
}

export async function listAdminOrganizations(
  input: { q?: string; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const where = input.q?.trim()
    ? or(ilike(organizations.name, `%${input.q.trim()}%`), ilike(organizations.slug, `%${input.q.trim()}%`))
    : undefined;
  return db
    .select()
    .from(organizations)
    .where(where)
    .orderBy(desc(organizations.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
}

export async function listAdminProducts(db: Database = requireDb()) {
  return db.select().from(products).orderBy(desc(products.createdAt)).limit(200);
}

export async function listAdminPlans(db: Database = requireDb()) {
  return db
    .select({
      id: plans.id,
      publicId: plans.publicId,
      slug: plans.slug,
      billingType: plans.billingType,
      status: plans.status,
      productId: plans.productId,
      productSlug: products.slug,
    })
    .from(plans)
    .innerJoin(products, eq(plans.productId, products.id))
    .orderBy(desc(plans.createdAt))
    .limit(200);
}

export async function listAdminFeatures(db: Database = requireDb()) {
  return db.select().from(features).orderBy(features.key).limit(200);
}

export async function listAdminPrices(db: Database = requireDb()) {
  return db
    .select({
      id: prices.id,
      publicId: prices.publicId,
      planId: prices.planId,
      planSlug: plans.slug,
      currency: prices.currency,
      region: prices.region,
      amountMinor: prices.amountMinor,
      interval: prices.interval,
      isActive: prices.isActive,
    })
    .from(prices)
    .innerJoin(plans, eq(prices.planId, plans.id))
    .orderBy(desc(prices.createdAt))
    .limit(200);
}

export async function listAdminOrders(
  input: { q?: string; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const where = input.q?.trim() ? ilike(orders.publicId, `%${input.q.trim()}%`) : undefined;
  return db
    .select({
      id: orders.id,
      publicId: orders.publicId,
      status: orders.status,
      currency: orders.currency,
      totalMinor: orders.totalMinor,
      createdAt: orders.createdAt,
      customerPublicId: customers.publicId,
      userId: customers.userId,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
}

export async function listAdminPayments(
  input: { q?: string; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const where = input.q?.trim() ? ilike(payments.publicId, `%${input.q.trim()}%`) : undefined;
  return db
    .select()
    .from(payments)
    .where(where)
    .orderBy(desc(payments.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
}

export async function listAdminSubscriptions(
  input: { page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  return db
    .select()
    .from(subscriptions)
    .orderBy(desc(subscriptions.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
}

export async function listAdminEntitlements(
  input: { q?: string; principalId?: string; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const filters: SQL[] = [];
  if (input.principalId) filters.push(eq(entitlements.principalId, input.principalId));
  if (input.q?.trim()) filters.push(ilike(entitlements.publicId, `%${input.q.trim()}%`));
  const where = filters.length ? and(...filters) : undefined;
  return db
    .select()
    .from(entitlements)
    .where(where)
    .orderBy(desc(entitlements.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
}

export async function listAdminLicenses(
  input: { q?: string; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const where = input.q?.trim() ? ilike(licenses.publicId, `%${input.q.trim()}%`) : undefined;
  return db
    .select({
      id: licenses.id,
      publicId: licenses.publicId,
      status: licenses.status,
      keyPrefix: licenses.keyPrefix,
      keyLast4: licenses.keyLast4,
      entitlementId: licenses.entitlementId,
      entitlementPublicId: entitlements.publicId,
      principalId: entitlements.principalId,
      productId: entitlements.productId,
      createdAt: licenses.createdAt,
      revokedReason: licenses.revokedReason,
    })
    .from(licenses)
    .innerJoin(entitlements, eq(licenses.entitlementId, entitlements.id))
    .where(where)
    .orderBy(desc(licenses.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
}

export async function getAdminLicense(publicId: string, db: Database = requireDb()) {
  const [row] = await db
    .select({
      id: licenses.id,
      publicId: licenses.publicId,
      status: licenses.status,
      keyPrefix: licenses.keyPrefix,
      keyLast4: licenses.keyLast4,
      entitlementId: licenses.entitlementId,
      entitlementPublicId: entitlements.publicId,
      principalType: entitlements.principalType,
      principalId: entitlements.principalId,
      productId: entitlements.productId,
      revokedReason: licenses.revokedReason,
      createdAt: licenses.createdAt,
    })
    .from(licenses)
    .innerJoin(entitlements, eq(licenses.entitlementId, entitlements.id))
    .where(eq(licenses.publicId, publicId))
    .limit(1);
  if (!row) return null;
  const history = await db
    .select()
    .from(activations)
    .where(eq(activations.licenseId, row.id))
    .orderBy(desc(activations.createdAt));
  return { ...row, activations: history };
}

export async function listAdminDevices(
  input: { principalId?: string; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const where = input.principalId ? eq(devices.principalId, input.principalId) : undefined;
  return db
    .select()
    .from(devices)
    .where(where)
    .orderBy(desc(devices.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
}

export async function listAdminPartners(
  input: { q?: string; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const where = input.q?.trim()
    ? or(ilike(partners.name, `%${input.q.trim()}%`), ilike(partners.slug, `%${input.q.trim()}%`))
    : undefined;
  return db
    .select({
      id: partners.id,
      publicId: partners.publicId,
      slug: partners.slug,
      name: partners.name,
      status: partners.status,
      tierId: partners.tierId,
      modes: partners.modes,
      createdAt: partners.createdAt,
      balanceMinor: wallets.balanceMinor,
      currency: wallets.currency,
    })
    .from(partners)
    .leftJoin(wallets, eq(wallets.partnerId, partners.id))
    .where(where)
    .orderBy(desc(partners.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
}

export async function listAdminTiers(db: Database = requireDb()) {
  return db.select().from(partnerTiers).orderBy(partnerTiers.slug);
}

export async function getAdminPartner(id: string, db: Database = requireDb()) {
  const [row] = await db
    .select({
      id: partners.id,
      publicId: partners.publicId,
      slug: partners.slug,
      name: partners.name,
      status: partners.status,
      tierId: partners.tierId,
      modes: partners.modes,
      createdAt: partners.createdAt,
      balanceMinor: wallets.balanceMinor,
      currency: wallets.currency,
    })
    .from(partners)
    .leftJoin(wallets, eq(wallets.partnerId, partners.id))
    .where(eq(partners.id, id))
    .limit(1);
  return row ?? null;
}

export async function listAdminCommissions(
  input: { page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  return db
    .select({
      id: commissions.id,
      publicId: commissions.publicId,
      partnerId: commissions.partnerId,
      partnerName: partners.name,
      amountMinor: commissions.amountMinor,
      currency: commissions.currency,
      status: commissions.status,
      createdAt: commissions.createdAt,
    })
    .from(commissions)
    .innerJoin(partners, eq(commissions.partnerId, partners.id))
    .orderBy(desc(commissions.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
}

export async function listAdminContent(
  input: { locale?: string; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const where = input.locale ? eq(contentVersions.locale, input.locale) : undefined;
  return db
    .select({
      versionId: contentVersions.id,
      entryId: contentEntries.id,
      slug: contentEntries.slug,
      contentType: contentEntries.contentType,
      locale: contentVersions.locale,
      title: contentVersions.title,
      status: contentVersions.status,
      versionNumber: contentVersions.versionNumber,
      updatedAt: contentVersions.updatedAt,
    })
    .from(contentVersions)
    .innerJoin(contentEntries, eq(contentVersions.entryId, contentEntries.id))
    .where(where)
    .orderBy(desc(contentVersions.updatedAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
}

export async function listAdminMedia(
  input: { context?: string; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const where = input.context ? eq(mediaAssets.context, input.context) : undefined;
  return db
    .select()
    .from(mediaAssets)
    .where(where)
    .orderBy(desc(mediaAssets.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
}

export async function listAdminAudit(
  input: { q?: string; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const where = input.q?.trim()
    ? or(
        ilike(auditLogs.action, `%${input.q.trim()}%`),
        ilike(auditLogs.resourceType, `%${input.q.trim()}%`),
        ilike(auditLogs.resourceId, `%${input.q.trim()}%`),
      )
    : undefined;
  return db
    .select()
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
}

export async function listAdminSystemEvents(
  input: { page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  return db
    .select()
    .from(systemEvents)
    .orderBy(desc(systemEvents.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
}

export async function countFinancialRefs(
  input: { productId?: string; planId?: string; priceId?: string },
  db: Database = requireDb(),
): Promise<number> {
  if (input.productId) {
    const [row] = await db
      .select({ n: count() })
      .from(orderItems)
      .where(eq(orderItems.productId, input.productId));
    return asCount(row?.n);
  }
  if (input.planId) {
    const [row] = await db
      .select({ n: count() })
      .from(orderItems)
      .where(eq(orderItems.planId, input.planId));
    return asCount(row?.n);
  }
  if (input.priceId) {
    const [row] = await db
      .select({ n: count() })
      .from(orderItems)
      .where(eq(orderItems.priceId, input.priceId));
    return asCount(row?.n);
  }
  return 0;
}
