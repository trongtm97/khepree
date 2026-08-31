import { and, count, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { requireDb, getDb, type Database } from "../client";
import {
  activations,
  auditLogs,
  commissions,
  contentCategories,
  contentCategoryTranslations,
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
  productTranslations,
  session,
  refunds,
  softwareReleases,
  subscriptions,
  systemEvents,
  urlRedirects,
  user,
  userProfiles,
  wallets,
  webhookEvents,
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

export async function listAdminProducts(
  input: { q?: string; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const where = input.q?.trim() ? ilike(products.slug, `%${input.q.trim()}%`) : undefined;
  return db
    .select()
    .from(products)
    .where(where)
    .orderBy(desc(products.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
}

export async function listAdminPlans(
  input: { q?: string; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const where = input.q?.trim() ? ilike(plans.slug, `%${input.q.trim()}%`) : undefined;
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
    .where(where)
    .orderBy(desc(plans.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
}

export async function listAdminFeatures(
  input: { q?: string; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const where = input.q?.trim() ? ilike(features.key, `%${input.q.trim()}%`) : undefined;
  return db.select().from(features).where(where).orderBy(features.key).limit(ADMIN_PAGE_SIZE).offset(offset);
}

export async function listAdminPrices(
  input: { q?: string; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const where = input.q?.trim() ? ilike(plans.slug, `%${input.q.trim()}%`) : undefined;
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
    .where(where)
    .orderBy(desc(prices.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
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

export async function listAdminWebhookEvents(
  input: { provider?: string; limit?: number } = {},
  db: Database = requireDb(),
) {
  const filters: SQL[] = [];
  if (input.provider?.trim()) filters.push(eq(webhookEvents.provider, input.provider.trim()));
  const where = filters.length ? and(...filters) : undefined;
  return db
    .select()
    .from(webhookEvents)
    .where(where)
    .orderBy(desc(webhookEvents.createdAt))
    .limit(Math.min(input.limit ?? 20, 50));
}

export async function listAdminSubscriptions(
  input: { q?: string; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const where = input.q?.trim() ? ilike(subscriptions.publicId, `%${input.q.trim()}%`) : undefined;
  return db
    .select()
    .from(subscriptions)
    .where(where)
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
  input: { q?: string; principalId?: string; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const filters: SQL[] = [];
  if (input.principalId) filters.push(eq(devices.principalId, input.principalId));
  if (input.q?.trim()) filters.push(ilike(devices.publicId, `%${input.q.trim()}%`));
  const where = filters.length ? and(...filters) : undefined;
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
  input: { q?: string; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const where = input.q?.trim() ? ilike(commissions.publicId, `%${input.q.trim()}%`) : undefined;
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
    .where(where)
    .orderBy(desc(commissions.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
}

export async function listAdminContent(
  input: {
    q?: string;
    locale?: string;
    contentType?: string;
    status?: string;
    page?: number;
  } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const filters: SQL[] = [isNull(contentEntries.deletedAt)];
  if (input.locale) filters.push(eq(contentVersions.locale, input.locale));
  if (input.contentType) filters.push(eq(contentEntries.contentType, input.contentType as "article" | "page" | "doc"));
  if (input.status) filters.push(eq(contentVersions.status, input.status as "DRAFT" | "PUBLISHED" | "ARCHIVED"));
  if (input.q?.trim()) {
    const term = `%${input.q.trim()}%`;
    const search = or(ilike(contentVersions.title, term), ilike(contentEntries.slug, term));
    if (search) filters.push(search);
  }
  const where = and(...filters);
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
      publishedAt: contentVersions.publishedAt,
      seoTitle: contentVersions.seoTitle,
      seoDescription: contentVersions.seoDescription,
      excerpt: contentVersions.excerpt,
      authorName: user.name,
      scheduledAt: contentVersions.scheduledAt,
    })
    .from(contentVersions)
    .innerJoin(contentEntries, eq(contentVersions.entryId, contentEntries.id))
    .leftJoin(user, eq(contentVersions.authorUserId, user.id))
    .where(where)
    .orderBy(desc(contentVersions.updatedAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
}

export async function listAdminContentCategories(locale: string, db: Database = requireDb()) {
  const rows = await db.select().from(contentCategories).orderBy(contentCategories.slug);
  if (rows.length === 0) return [];
  const translations = await db
    .select()
    .from(contentCategoryTranslations)
    .where(eq(contentCategoryTranslations.locale, locale));
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: translations.find((t) => t.categoryId === row.id)?.name ?? row.slug,
  }));
}

export type AdminMediaFilter =
  | "all"
  | "images"
  | "product"
  | "content"
  | "release"
  | "private";

export async function listAdminMedia(
  input: { q?: string; context?: string; filter?: AdminMediaFilter; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const filters: SQL[] = [];
  if (input.context) filters.push(eq(mediaAssets.context, input.context));
  if (input.filter === "images") filters.push(ilike(mediaAssets.mimeType, "image/%"));
  if (input.filter === "private") filters.push(eq(mediaAssets.visibility, "private"));
  if (input.filter === "product") {
    filters.push(or(ilike(mediaAssets.context, "product:%"), ilike(mediaAssets.context, "release:%"))!);
  }
  if (input.filter === "content") filters.push(ilike(mediaAssets.context, "content:%"));
  if (input.filter === "release") filters.push(ilike(mediaAssets.context, "release:%"));
  if (input.q?.trim()) {
    const term = `%${input.q.trim()}%`;
    filters.push(
      or(
        ilike(mediaAssets.publicId, term),
        ilike(mediaAssets.altText, term),
        ilike(mediaAssets.context, term),
        ilike(mediaAssets.objectKey, term),
      )!,
    );
  }
  const where = filters.length ? and(...filters) : undefined;
  return db
    .select()
    .from(mediaAssets)
    .where(where)
    .orderBy(desc(mediaAssets.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
}

export async function getAdminMediaByPublicId(publicId: string, db: Database = requireDb()) {
  const [row] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.publicId, publicId))
    .limit(1);
  return row ?? null;
}

export async function listAdminReleases(
  input: { productId?: string; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const where = input.productId ? eq(softwareReleases.productId, input.productId) : undefined;
  return db
    .select({
      id: softwareReleases.id,
      publicId: softwareReleases.publicId,
      productId: softwareReleases.productId,
      version: softwareReleases.version,
      platform: softwareReleases.platform,
      architecture: softwareReleases.architecture,
      channel: softwareReleases.channel,
      fileName: softwareReleases.fileName,
      fileSize: softwareReleases.fileSize,
      status: softwareReleases.status,
      publishedAt: softwareReleases.publishedAt,
      updatedAt: softwareReleases.updatedAt,
      productSlug: products.slug,
      productPublicId: products.publicId,
      nameVi: productTranslations.name,
    })
    .from(softwareReleases)
    .innerJoin(products, eq(softwareReleases.productId, products.id))
    .leftJoin(
      productTranslations,
      and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, "vi")),
    )
    .where(where)
    .orderBy(desc(softwareReleases.updatedAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
}

export async function listAdminProductsForPicker(db: Database = requireDb()) {
  return db
    .select({
      id: products.id,
      publicId: products.publicId,
      slug: products.slug,
      nameVi: productTranslations.name,
    })
    .from(products)
    .leftJoin(
      productTranslations,
      and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, "vi")),
    )
    .orderBy(desc(products.updatedAt))
    .limit(200);
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

export async function listAdminRefunds(
  input: { q?: string; page?: number } = {},
  db: Database = requireDb(),
) {
  const offset = adminOffset(input.page ?? 1);
  const filters: SQL[] = [];
  if (input.q?.trim()) {
    const term = `%${input.q.trim()}%`;
    const match = or(ilike(refunds.publicId, term), ilike(payments.publicId, term));
    if (match) filters.push(match);
  }
  const where = filters.length ? and(...filters) : undefined;
  return db
    .select({
      id: refunds.id,
      publicId: refunds.publicId,
      status: refunds.status,
      amountMinor: refunds.amountMinor,
      currency: refunds.currency,
      provider: refunds.provider,
      reason: refunds.reason,
      createdAt: refunds.createdAt,
      paymentPublicId: payments.publicId,
    })
    .from(refunds)
    .innerJoin(payments, eq(refunds.paymentId, payments.id))
    .where(where)
    .orderBy(desc(refunds.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);
}

export async function findActiveUrlRedirect(fromPath: string, db: Database | null = getDb()) {
  if (!db) return null;
  const [row] = await db
    .select({ toPath: urlRedirects.toPath, status: urlRedirects.status })
    .from(urlRedirects)
    .where(and(eq(urlRedirects.fromPath, fromPath), eq(urlRedirects.isActive, true)))
    .limit(1);
  return row ?? null;
}

export async function listAdminUrlRedirects(db: Database = requireDb()) {
  return db.select().from(urlRedirects).orderBy(desc(urlRedirects.updatedAt)).limit(200);
}

export async function insertUrlRedirect(
  input: { fromPath: string; toPath: string; status: number; note?: string | null },
  db: Database = requireDb(),
) {
  const [row] = await db
    .insert(urlRedirects)
    .values({
      fromPath: input.fromPath,
      toPath: input.toPath,
      status: input.status,
      note: input.note ?? null,
    })
    .returning();
  return row;
}

export async function deleteUrlRedirect(id: string, db: Database = requireDb()) {
  await db.delete(urlRedirects).where(eq(urlRedirects.id, id));
}

export async function listAdminActionQueue(db: Database = requireDb()) {
  const [draftProducts, draftContent, draftReleases, manualRefunds, missingSeo] = await Promise.all([
    db
      .select({
        id: products.id,
        slug: products.slug,
        nameVi: productTranslations.name,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(
        productTranslations,
        and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, "vi")),
      )
      .where(eq(products.status, "draft"))
      .orderBy(desc(products.updatedAt))
      .limit(20),
    db
      .select({
        versionId: contentVersions.id,
        entryId: contentEntries.id,
        slug: contentEntries.slug,
        contentType: contentEntries.contentType,
        locale: contentVersions.locale,
        title: contentVersions.title,
        updatedAt: contentVersions.updatedAt,
      })
      .from(contentVersions)
      .innerJoin(contentEntries, eq(contentVersions.entryId, contentEntries.id))
      .where(and(eq(contentVersions.status, "DRAFT"), isNull(contentEntries.deletedAt)))
      .orderBy(desc(contentVersions.updatedAt))
      .limit(20),
    db
      .select({
        id: softwareReleases.id,
        version: softwareReleases.version,
        productId: softwareReleases.productId,
        status: softwareReleases.status,
        updatedAt: softwareReleases.updatedAt,
      })
      .from(softwareReleases)
      .where(eq(softwareReleases.status, "draft"))
      .orderBy(desc(softwareReleases.updatedAt))
      .limit(20),
    db
      .select({
        id: refunds.id,
        publicId: refunds.publicId,
        status: refunds.status,
        createdAt: refunds.createdAt,
      })
      .from(refunds)
      .where(eq(refunds.status, "manual_required"))
      .orderBy(desc(refunds.createdAt))
      .limit(20),
    db
      .select({
        id: products.id,
        slug: products.slug,
        locale: productTranslations.locale,
        name: productTranslations.name,
      })
      .from(productTranslations)
      .innerJoin(products, eq(productTranslations.productId, products.id))
      .where(
        and(
          eq(products.status, "active"),
          or(isNull(productTranslations.seoTitle), eq(productTranslations.seoTitle, "")),
        ),
      )
      .limit(20),
  ]);

  return { draftProducts, draftContent, draftReleases, manualRefunds, missingSeo };
}
