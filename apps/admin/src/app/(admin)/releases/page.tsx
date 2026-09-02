import { listAdminProductsForPicker, listAdminReleases } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminFormSection,
  AdminPageHeader,
  AdminStatusBadge,
  AdminTable,
  AdminTd,
  statusTone,
} from "@/components/admin";
import { ReleaseUploadForm } from "@/components/release/release-upload-form";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate } from "@/lib/format";
import { labelStatus } from "@/lib/labels";
import { getReleaseService } from "@/lib/release-service";

export const metadata: Metadata = { title: "Phiên bản" };

export default async function ReleasesPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  const session = await requireAdmin("content.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "catalog.write");
  const products = await listAdminProductsForPicker();
  const productId = (await searchParams).productId ?? products[0]?.id ?? "";
  const rows = productId ? await listAdminReleases({ productId, page: 1 }) : [];
  const readinessByReleaseId = new Map(
    await Promise.all(
      rows
        .filter((row) => row.status === "draft")
        .map(async (row) => [row.id, await getReleaseService().getPublishReadiness(row.id)] as const),
    ),
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Phiên bản"
        description="Chọn sản phẩm, tải bộ cài riêng tư, rồi xuất bản. Không nhập media ID."
      />
      <div className="flex flex-wrap gap-2 text-sm">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/releases?productId=${product.id}`}
            className={`rounded px-2 py-1 ${product.id === productId ? "bg-khepree-teal text-white" : "bg-khepree-mist"}`}
          >
            {product.nameVi ?? product.slug}
          </Link>
        ))}
      </div>
      <AdminTable
        headers={["Sản phẩm", "Phiên bản", "Nền tảng", "Kiến trúc", "Kênh", "Verified", "Trạng thái", "Ngày phát hành", ""]}
        empty={rows.length === 0}
      >
        {rows.map((row) => (
          <tr key={row.id}>
            <AdminTd>
              <Link className="text-khepree-teal underline" href={`/products/${row.productId}?tab=releases`}>
                {row.nameVi ?? row.productSlug}
              </Link>
            </AdminTd>
            <AdminTd>{row.version}</AdminTd>
            <AdminTd>{row.platform}</AdminTd>
            <AdminTd>{row.architecture}</AdminTd>
            <AdminTd>{row.channel}</AdminTd>
            <AdminTd>
              {row.status === "draft" ? (
                readinessByReleaseId.get(row.id)?.ready ? (
                  <AdminStatusBadge label="Sẵn sàng publish" tone="success" />
                ) : (
                  <AdminStatusBadge label="Chưa verified" tone="warning" />
                )
              ) : (
                "—"
              )}
            </AdminTd>
            <AdminTd>
              <AdminStatusBadge label={labelStatus(row.status)} tone={statusTone(row.status)} />
            </AdminTd>
            <AdminTd>{row.publishedAt ? formatDate(row.publishedAt) : "—"}</AdminTd>
            <AdminTd>
              <Link className="text-khepree-teal underline" href={`/releases/${row.publicId}`}>
                Chi tiết
              </Link>
            </AdminTd>
          </tr>
        ))}
      </AdminTable>
      {canWrite && productId ? (
        <AdminFormSection title="Tạo phiên bản">
          <ReleaseUploadForm productId={productId} />
        </AdminFormSection>
      ) : null}
    </div>
  );
}
