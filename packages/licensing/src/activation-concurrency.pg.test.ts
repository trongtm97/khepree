import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  activations,
  createPublicId,
  devices,
  entitlements,
  features,
  getDb,
  licenseEvents,
  licenseLeases,
  licenses,
  planFeatures,
  plans,
  products,
  user,
} from "@khepree/db";
import { createEntitlementService } from "@khepree/entitlement";
import { isLicensingError } from "./errors";
import { generateEphemeralSigningKeys } from "./lease";
import { createLicensingService } from "./service";

const db = getDb();
const pg = Boolean(db && process.env.INTEGRATION === "1");

describe.skipIf(!pg)("Device activation concurrency (Postgres)", () => {
  it("allows only one of two concurrent activations when devices.max is 1", async () => {
    if (!db) throw new Error("DATABASE_URL required");
    const suffix = crypto.randomUUID();
    const userId = `lic_${suffix}`;
    await db.insert(user).values({
      id: userId,
      name: "License",
      email: `${userId}@example.test`,
      emailVerified: false,
    });

    const [existingFeature] = await db.select().from(features).where(eq(features.key, "devices.max")).limit(1);
    const feature =
      existingFeature ??
      (
        await db
          .insert(features)
          .values({ key: "devices.max", valueType: "integer", description: "max devices" })
          .returning()
      )[0];
    if (!feature) throw new Error("feature insert failed");

    const [product] = await db
      .insert(products)
      .values({
        publicId: createPublicId("prd"),
        slug: `lic-${suffix}`,
        status: "active",
        licensingMode: "LICENSE_KEY_DEVICE",
      })
      .returning();
    if (!product) throw new Error("product insert failed");
    const [plan] = await db
      .insert(plans)
      .values({
        publicId: createPublicId("pln"),
        productId: product.id,
        slug: "seat",
        billingType: "perpetual",
        accessTermDays: null,
        status: "active",
      })
      .returning();
    if (!plan) throw new Error("plan insert failed");
    await db.insert(planFeatures).values({
      planId: plan.id,
      featureId: feature.id,
      integerValue: 1,
    });

    const entitlement = createEntitlementService({ db });
    const granted = await entitlement.grantEntitlement({
      principal: { type: "USER", id: userId },
      productId: product.id,
      planId: plan.id,
      source: "perpetual",
    });
    if (!granted.licenseKey || !granted.license) throw new Error("expected license key");

    const licensing = createLicensingService({
      db,
      entitlement,
      keys: generateEphemeralSigningKeys(),
      deactivateCooldownSeconds: 0,
    });

    const results = await Promise.allSettled([
      licensing.activate({ licenseKey: granted.licenseKey, installationId: `a-${suffix}`, platform: "windows" }),
      licensing.activate({ licenseKey: granted.licenseKey, installationId: `b-${suffix}`, platform: "macos" }),
    ]);
    const ok = results.filter((row) => row.status === "fulfilled");
    const denied = results.filter((row) => row.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(denied).toHaveLength(1);
    const rejected = denied[0];
    expect(rejected?.status).toBe("rejected");
    if (rejected?.status === "rejected") {
      expect(isLicensingError(rejected.reason) && rejected.reason.code === "DEVICE_LIMIT_REACHED").toBe(true);
    }

    await db.delete(licenseEvents).where(eq(licenseEvents.licenseId, granted.license.id));
    await db.delete(licenseLeases).where(eq(licenseLeases.licenseId, granted.license.id));
    await db.delete(activations).where(eq(activations.licenseId, granted.license.id));
    await db.delete(devices).where(eq(devices.principalId, userId));
    await db.delete(licenses).where(eq(licenses.id, granted.license.id));
    await db.delete(entitlements).where(eq(entitlements.principalId, userId));
    await db.delete(planFeatures).where(eq(planFeatures.planId, plan.id));
    await db.delete(plans).where(eq(plans.id, plan.id));
    await db.delete(products).where(eq(products.id, product.id));
    await db.delete(user).where(eq(user.id, userId));
  });
});
