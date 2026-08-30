import { listAdminProductsForPicker, listAdminReleases } from "@khepree/db";
import type { Metadata } from "next";
import { signReleaseDownloadAction } from "@/app/(admin)/actions";
import { AdminFormSection, AdminPageHeader } from "@/components/admin";
import { ActionForm } from "@/components/action-form";
import { requireAdmin } from "@/lib/admin-session";
import { Select } from "@khepree/ui";

export const metadata: Metadata = { title: "Tải xuống" };

export default async function DownloadsPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  await requireAdmin("content.read");
  const params = await searchParams;
  const products = await listAdminProductsForPicker();
  const productId = params.productId ?? products[0]?.id ?? "";
  const releases = productId ? await listAdminReleases({ productId, page: 1 }) : [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tải xuống"
        description="Chọn sản phẩm và phiên bản — không cần nhập media ID."
      />
      <div className="flex flex-wrap gap-2 text-sm">
        {products.map((product) => (
          <a
            key={product.id}
            href={`/downloads?productId=${product.id}`}
            className={`rounded px-2 py-1 ${product.id === productId ? "bg-khepree-teal text-white" : "bg-khepree-mist"}`}
          >
            {product.nameVi ?? product.slug}
          </a>
        ))}
      </div>
      <AdminFormSection title="Tải bản phát hành">
        {releases.length === 0 ? (
          <p className="text-sm text-khepree-slate/70">Chưa có phiên bản cho sản phẩm này.</p>
        ) : (
          <ActionForm action={signReleaseDownloadAction} submitLabel="Tạo URL tải">
            <Select
              name="releasePublicId"
              label="Phiên bản"
              options={releases.map((row) => ({
                value: row.publicId,
                label: `${row.version} · ${row.platform}/${row.architecture} (${row.status})`,
              }))}
            />
          </ActionForm>
        )}
      </AdminFormSection>
    </div>
  );
}
