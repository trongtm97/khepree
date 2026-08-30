import { computeProductReadiness } from "@khepree/catalog";
import { hasPermission } from "@khepree/security";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ProductStudioTabs } from "@/components/product-studio/product-studio-tabs";
import { AdminStatusBadge, statusTone } from "@/components/admin";
import { requireAdmin } from "@/lib/admin-session";
import { getProductStudio, webPreviewBaseUrl } from "@/lib/product-studio";
import { labelStatus } from "@/lib/labels";
import { formatDate } from "@/lib/format";

export default async function ProductStudioLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ productId: string }>;
}) {
  const session = await requireAdmin("catalog.read");
  const { productId } = await params;
  const snapshot = await getProductStudio().getSnapshot(productId);
  if (!snapshot) notFound();

  const vi = snapshot.translations.find((t) => t.locale === "vi");
  const readiness = computeProductReadiness(snapshot);
  const canWrite = hasPermission({ globalRole: session.globalRole }, "catalog.write");
  const previewUrl = getProductStudio().previewUrl(
    { id: snapshot.id, slug: snapshot.slug },
    webPreviewBaseUrl(),
  );

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 border-b border-khepree-mist bg-khepree-cloud/95 px-4 py-3 backdrop-blur sm:-mx-0 sm:px-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-khepree-slate/60">Xưởng sản phẩm</p>
            <h1 className="text-xl font-bold">{vi?.name ?? snapshot.slug}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <AdminStatusBadge label={labelStatus(snapshot.status)} tone={statusTone(snapshot.status)} />
              <span className="text-khepree-slate/70">Cập nhật {formatDate(snapshot.updatedAt)}</span>
              {readiness.ready ? (
                <AdminStatusBadge label="Sẵn sàng xuất bản" tone="success" />
              ) : (
                <span className="text-amber-800">Còn {readiness.blockingCount} mục</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[var(--radius-control)] border border-khepree-mist bg-khepree-white px-3 py-1.5 text-sm hover:bg-khepree-mist/40"
            >
              Xem trước
            </Link>
            {canWrite ? (
              <span className="rounded-[var(--radius-control)] bg-khepree-mist px-3 py-1.5 text-xs text-khepree-slate/70">
                Lưu qua từng tab
              </span>
            ) : null}
          </div>
        </div>
        <div className="mt-3">
          <Suspense fallback={<div className="h-9 animate-pulse rounded bg-khepree-mist" />}>
            <ProductStudioTabs productId={productId} />
          </Suspense>
        </div>
      </div>
      {children}
    </div>
  );
}
