import { and, eq, ne, sql } from "drizzle-orm";
import {
  desktopClients,
  desktopSessions,
  entitlements,
  orderItems,
  products,
  type Database,
} from "@khepree/db";
import {
  deriveDesktopCallbackUri,
  parseAccessFeatureKey,
  parseDesktopProtocol,
  parseProductCode,
  suggestAccessFeatureKey,
  suggestDesktopClientId,
  suggestDesktopProtocol,
  suggestProductCode,
  validateCallbackUri,
  validateDesktopClientId,
  validateDesktopProtocol,
  validateProductCode,
} from "../technical-identity";
import type { ProductType } from "../studio-field-policy";
import { CatalogError } from "../admin";

export async function checkProductIdentityLocked(
  db: Database,
  productId: string,
): Promise<{ locked: boolean; reason: string | null }> {
  const [entitlement] = await db
    .select({ id: entitlements.id })
    .from(entitlements)
    .where(eq(entitlements.productId, productId))
    .limit(1);
  if (entitlement) {
    return {
      locked: true,
      reason: "Sản phẩm đã có entitlement — không thể đổi Product Code hoặc Desktop Client.",
    };
  }

  const [order] = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .where(eq(orderItems.productId, productId))
    .limit(1);
  if (order) {
    return { locked: true, reason: "Sản phẩm đã có đơn hàng — không thể đổi Product Code." };
  }

  const [session] = await db
    .select({ id: desktopSessions.id })
    .from(desktopSessions)
    .where(eq(desktopSessions.productId, productId))
    .limit(1);
  if (session) {
    return {
      locked: true,
      reason: "Sản phẩm đã có phiên desktop — không thể đổi Desktop Client hoặc protocol.",
    };
  }

  return { locked: false, reason: null };
}

export async function assertUniqueProductCode(
  db: Database,
  productCode: string,
  productId: string,
): Promise<void> {
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        sql`${products.metadata}->>'productCode' = ${productCode}`,
        ne(products.id, productId),
      ),
    )
    .limit(1);
  if (row) throw new CatalogError("CONFLICT", `Product Code "${productCode}" đã được sử dụng`);
}

export async function assertUniqueDesktopProtocol(
  db: Database,
  protocol: string,
  productId: string,
): Promise<void> {
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        sql`${products.metadata}->>'desktopProtocol' = ${protocol}`,
        ne(products.id, productId),
      ),
    )
    .limit(1);
  if (row) throw new CatalogError("CONFLICT", `Desktop protocol "${protocol}" đã được sử dụng`);
}

export async function assertUniqueDesktopClientId(
  db: Database,
  clientId: string,
  productId: string,
): Promise<void> {
  const [row] = await db
    .select({ id: desktopClients.id })
    .from(desktopClients)
    .where(and(eq(desktopClients.clientId, clientId), ne(desktopClients.productId, productId)))
    .limit(1);
  if (row) throw new CatalogError("CONFLICT", `Desktop Client ID "${clientId}" đã được sử dụng`);
}

export function resolveProductTechnicalFields(input: {
  nameVi: string;
  metadata: Record<string, unknown>;
  productType: ProductType | null;
  overrides?: {
    productCode?: string;
    accessFeatureKey?: string;
    desktopClientId?: string;
    desktopProtocol?: string;
  };
  identityLocked: boolean;
}): {
  productCode: string;
  accessFeatureKey: string;
  desktopProtocol: string | null;
  desktopClientId: string | null;
  desktopCallbackUri: string | null;
} {
  const existingCode = parseProductCode(input.metadata);
  const existingAccess = parseAccessFeatureKey(input.metadata);
  const existingProtocol = parseDesktopProtocol(input.metadata);
  const isDesktop = input.productType === "desktop-software";

  const productCode =
    input.overrides?.productCode?.trim() ||
    existingCode ||
    suggestProductCode(input.nameVi);
  if (!validateProductCode(productCode)) {
    throw new CatalogError("INVALID_INPUT", "Product Code không hợp lệ");
  }
  if (input.identityLocked && existingCode && productCode !== existingCode) {
    throw new CatalogError("CONFLICT", "Product Code đã khóa — có dữ liệu phụ thuộc");
  }

  const accessFeatureKey =
    input.overrides?.accessFeatureKey?.trim() ||
    existingAccess ||
    suggestAccessFeatureKey(input.nameVi);

  let desktopProtocol: string | null = null;
  let desktopClientId: string | null = null;
  let desktopCallbackUri: string | null = null;

  if (isDesktop) {
    desktopProtocol =
      input.overrides?.desktopProtocol?.trim().toLowerCase() ||
      existingProtocol ||
      suggestDesktopProtocol(input.nameVi);
    if (!validateDesktopProtocol(desktopProtocol)) {
      throw new CatalogError("INVALID_INPUT", "Desktop protocol không hợp lệ");
    }
    desktopClientId =
      input.overrides?.desktopClientId?.trim() ||
      suggestDesktopClientId(input.nameVi);
    if (!desktopClientId || !validateDesktopClientId(desktopClientId)) {
      throw new CatalogError("INVALID_INPUT", "Desktop Client ID không hợp lệ");
    }
    desktopCallbackUri = deriveDesktopCallbackUri(desktopProtocol);
    if (!validateCallbackUri(desktopProtocol, desktopCallbackUri)) {
      throw new CatalogError("INVALID_INPUT", "Callback URI không hợp lệ");
    }
  }

  return { productCode, accessFeatureKey, desktopProtocol, desktopClientId, desktopCallbackUri };
}

export async function syncDesktopClient(
  db: Database,
  input: {
    productId: string;
    displayName: string;
    clientId: string;
    callbackUri: string;
    active: boolean;
  },
): Promise<void> {
  const [existing] = await db
    .select()
    .from(desktopClients)
    .where(eq(desktopClients.productId, input.productId))
    .limit(1);

  const allowedRedirectUris = [input.callbackUri];
  const status = input.active ? "active" : "inactive";

  if (existing) {
    await db
      .update(desktopClients)
      .set({
        clientId: input.clientId,
        displayName: input.displayName,
        allowedRedirectUris,
        status,
        updatedAt: new Date(),
      })
      .where(eq(desktopClients.id, existing.id));
    return;
  }

  if (!input.active) return;

  await db.insert(desktopClients).values({
    clientId: input.clientId,
    productId: input.productId,
    displayName: input.displayName,
    allowedRedirectUris,
    status: "active",
  });
}

export async function loadDesktopClientForProduct(
  db: Database,
  productId: string,
): Promise<{ clientId: string; callbackUri: string | null } | null> {
  const [row] = await db
    .select()
    .from(desktopClients)
    .where(eq(desktopClients.productId, productId))
    .limit(1);
  if (!row) return null;
  const callbackUri = row.allowedRedirectUris[0] ?? null;
  return { clientId: row.clientId, callbackUri };
}
