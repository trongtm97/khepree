import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../client";
import { products } from "../schema/catalog";
import { entitlements } from "../schema/entitlement";
import type { PrincipalType } from "./entitlements";

export async function findProductBySlug(db: Database, slug: string) {
  const rows = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function findActiveEntitlement(
  db: Database,
  input: {
    principalType: PrincipalType;
    principalId: string;
    productId: string;
  },
) {
  const rows = await db
    .select()
    .from(entitlements)
    .where(
      and(
        eq(entitlements.principalType, input.principalType),
        eq(entitlements.principalId, input.principalId),
        eq(entitlements.productId, input.productId),
        eq(entitlements.status, "active"),
        isNull(entitlements.revokedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}
