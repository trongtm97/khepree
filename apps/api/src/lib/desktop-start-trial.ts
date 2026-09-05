import { and, eq } from "drizzle-orm";
import { getDb, plans, type Database } from "@khepree/db";
import type { EntitlementService, PrincipalRef } from "@khepree/entitlement";
import { isLicensingError } from "@khepree/licensing";

export type FreeTrialPlanCandidate = {
  id: string;
  slug: string;
  billingType: string;
  status: string;
};

/** True when the principal has never held any entitlement for this product. */
export function isEligibleForFreeTrial(
  entitlements: Array<{ productId: string }>,
  productId: string,
): boolean {
  return !entitlements.some((row) => row.productId === productId);
}

/** Prefer slug `trial`, otherwise first active free plan. */
export function pickFreeTrialPlan(candidates: FreeTrialPlanCandidate[]): FreeTrialPlanCandidate | null {
  const activeFree = candidates.filter(
    (row) => row.status === "active" && row.billingType === "free",
  );
  if (activeFree.length === 0) return null;
  return activeFree.find((row) => row.slug === "trial") ?? activeFree[0] ?? null;
}

export async function findActiveFreeTrialPlan(
  productId: string,
  db: Database | null | undefined = getDb(),
): Promise<FreeTrialPlanCandidate | null> {
  if (!db) return null;
  const rows = await db
    .select({
      id: plans.id,
      slug: plans.slug,
      billingType: plans.billingType,
      status: plans.status,
    })
    .from(plans)
    .where(and(eq(plans.productId, productId), eq(plans.status, "active"), eq(plans.billingType, "free")));
  return pickFreeTrialPlan(rows);
}

/**
 * When activate fails with ENTITLEMENT_MISSING and the user never had this product,
 * grant the catalog free trial once. Returns true if a trial was granted.
 */
export async function tryGrantFreeTrialOnce(input: {
  entitlement: EntitlementService;
  principal: PrincipalRef;
  productId: string;
  actorUserId?: string;
  db?: Database | null;
}): Promise<boolean> {
  const history = await input.entitlement.resolveEntitlementsForPrincipal(input.principal);
  if (
    !isEligibleForFreeTrial(
      history.map((row) => row.entitlement),
      input.productId,
    )
  ) {
    return false;
  }

  const trialPlan = await findActiveFreeTrialPlan(input.productId, input.db);
  if (!trialPlan) return false;

  await input.entitlement.grantEntitlement({
    principal: input.principal,
    productId: input.productId,
    planId: trialPlan.id,
    source: "trial",
    actorUserId: input.actorUserId ?? (input.principal.type === "USER" ? input.principal.id : null),
    metadata: { grantedBy: "desktop_activate_auto_trial" },
  });
  return true;
}

export function isEntitlementMissingError(error: unknown): boolean {
  return isLicensingError(error) && error.code === "ENTITLEMENT_MISSING";
}
