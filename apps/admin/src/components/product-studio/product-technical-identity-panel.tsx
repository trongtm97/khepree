"use client";

import type { ProductStudioSnapshot } from "@khepree/catalog/product/studio/types";
import { parseProductType } from "@khepree/catalog/product/studio-field-policy";
import { deriveTechnicalIdentity } from "@khepree/catalog/product/technical-identity";
import { Input } from "@khepree/ui";

type Props = {
  snapshot: ProductStudioSnapshot;
  productName: string;
  productType: string;
};

export function ProductTechnicalIdentityPanel({ snapshot, productName, productType }: Props) {
  const type = parseProductType({ productType });
  const preview = deriveTechnicalIdentity({
    name: productName || "Sản phẩm mới",
    productType: type,
    slug: snapshot.slug,
    productCode: snapshot.productCode,
  });
  const locked = snapshot.identityLocked;
  const isDesktop = type === "desktop-software";

  return (
    <div className="space-y-3 border-t border-khepree-mist/80 pt-4">
      <h3 className="text-sm font-semibold text-khepree-slate">Technical Identity</h3>
      {locked && snapshot.identityLockReason ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {snapshot.identityLockReason}
        </p>
      ) : null}
      <p className="text-xs text-khepree-slate/60">
        Product ID: <span className="font-mono">{snapshot.publicId}</span> (read-only)
      </p>
      <Input
        name="slug"
        label="Product Slug"
        defaultValue={preview.slug}
        readOnly={locked}
      />
      <Input
        name="productCode"
        label="Product Code"
        defaultValue={snapshot.productCode ?? preview.productCode}
        readOnly={locked}
        className="font-mono uppercase"
      />
      <Input
        name="accessFeatureKey"
        label="Access Feature"
        defaultValue={snapshot.accessFeatureKey ?? preview.accessFeatureKey}
        readOnly={locked}
        className="font-mono text-sm"
      />
      {isDesktop ? (
        <>
          <Input
            name="desktopClientId"
            label="Desktop Client ID"
            defaultValue={snapshot.desktopClientId ?? preview.desktopClientId ?? ""}
            readOnly={locked}
            className="font-mono text-sm"
          />
          <Input
            name="desktopProtocol"
            label="Desktop Protocol"
            defaultValue={snapshot.desktopProtocol ?? preview.desktopProtocol ?? ""}
            readOnly={locked}
            className="font-mono text-sm"
          />
          <Input
            label="Callback URI"
            defaultValue={snapshot.desktopCallbackUri ?? preview.desktopCallbackUri ?? ""}
            readOnly
            className="font-mono text-sm"
          />
        </>
      ) : null}
      {!locked && productName ? (
        <div className="rounded bg-khepree-cloud/50 p-3 text-xs text-khepree-slate/70">
          <p className="font-medium text-khepree-slate">Preview khi lưu</p>
          <ul className="mt-1 space-y-0.5 font-mono">
            <li>Slug: {preview.slug}</li>
            <li>Code: {preview.productCode}</li>
            {isDesktop ? (
              <>
                <li>Client: {preview.desktopClientId}</li>
                <li>Protocol: {preview.desktopProtocol}</li>
                <li>Callback: {preview.desktopCallbackUri}</li>
              </>
            ) : null}
            <li>Access: {preview.accessFeatureKey}</li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
