import { computeProductReadiness } from "@khepree/catalog";
import { hasPermission } from "@khepree/security";
import { notFound } from "next/navigation";
import { ProductStudioWorkspace } from "@/components/product-studio/product-studio-workspace";
import { AdminStatusBadge, statusTone } from "@/components/admin";
import { requireAdmin } from "@/lib/admin-session";
import { getProductStudio, webPreviewBaseUrl } from "@/lib/product-studio";
import { getReleaseService } from "@/lib/release-service";
import { labelStatus } from "@/lib/labels";
import { formatDate } from "@/lib/format";

export default async function ProductStudioPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const session = await requireAdmin("catalog.read");
  const { productId } = await params;
  const studio = getProductStudio();
  const snapshot = await studio.getSnapshot(productId);
  if (!snapshot) notFound();

  const vi = snapshot.translations.find((t) => t.locale === "vi");
  const readiness = computeProductReadiness(snapshot);
  const canWrite = hasPermission({ globalRole: session.globalRole }, "catalog.write");
  const previewUrl = studio.previewUrl({ id: snapshot.id, slug: snapshot.slug }, webPreviewBaseUrl());
  const releases = await getReleaseService().listForProduct(productId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-khepree-slate/60">Product Studio</p>
          <h1 className="text-xl font-bold">{vi?.name ?? snapshot.slug}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <AdminStatusBadge label={labelStatus(snapshot.status)} tone={statusTone(snapshot.status)} />
            <span className="text-khepree-slate/70">Cập nhật {formatDate(snapshot.updatedAt)}</span>
            {readiness.ready ? (
              <AdminStatusBadge label="Sẵn sàng xuất bản" tone="success" />
            ) : (
              <span className="text-amber-800">Còn {readiness.blockingCount} mục để xuất bản</span>
            )}
          </div>
        </div>
      </div>
      <ProductStudioWorkspace
        snapshot={snapshot}
        previewUrl={previewUrl}
        canWrite={canWrite}
        releases={releases.map((r) => ({
          id: r.id,
          version: r.version,
          platform: r.platform,
          status: r.status,
          publishedAt: r.publishedAt,
        }))}
      />
    </div>
  );
}
