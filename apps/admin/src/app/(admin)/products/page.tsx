import { ADMIN_PAGE_SIZE } from "@khepree/db";
import { PRODUCT_TYPE_LABELS } from "@khepree/catalog";
import { hasPermission } from "@khepree/security";
import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminPageHeader,
  AdminStatusBadge,
  AdminTable,
  AdminTd,
  statusTone,
} from "@/components/admin";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { getProductStudio, webPreviewBaseUrl } from "@/lib/product-studio";
import { labelStatus } from "@/lib/labels";
import { formatDate, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Sản phẩm" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requireAdmin("catalog.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "catalog.write");
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const rows = await getProductStudio().listSummaries({ q, page, pageSize: ADMIN_PAGE_SIZE });
  const studio = getProductStudio();
  const previewBase = webPreviewBaseUrl();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Sản phẩm"
        description="Product Studio — tạo và hoàn thiện sản phẩm tại một nơi."
        actions={
          canWrite ? (
            <Link
              href="/products/new"
              className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-khepree-teal px-4 text-sm font-medium text-white hover:opacity-90"
            >
              Tạo sản phẩm
            </Link>
          ) : null
        }
      />
      <SearchForm q={q} />
      <AdminTable
        headers={["", "Sản phẩm", "Loại", "Trạng thái", "Gói", "Phiên bản", "Cập nhật", ""]}
        empty={rows.length === 0}
      >
        {rows.map((row) => {
          const previewUrl = studio.previewUrl({ id: row.id, slug: row.slug }, previewBase);
          const productType = row.productType ? PRODUCT_TYPE_LABELS[row.productType as keyof typeof PRODUCT_TYPE_LABELS] ?? row.productType : "—";
          return (
            <tr key={row.id}>
              <AdminTd>
                {row.iconMediaPublicId ? (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-khepree-mist text-[10px] text-khepree-slate/60">
                    ◆
                  </span>
                ) : (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded border border-dashed border-khepree-mist text-xs text-khepree-slate/40">
                    —
                  </span>
                )}
              </AdminTd>
              <AdminTd>
                <div className="font-medium">{row.nameVi ?? row.slug}</div>
                {row.nameEn ? <div className="text-xs text-khepree-slate/70">{row.nameEn}</div> : null}
              </AdminTd>
              <AdminTd>{productType}</AdminTd>
              <AdminTd>
                <AdminStatusBadge label={labelStatus(row.status)} tone={statusTone(row.status)} />
              </AdminTd>
              <AdminTd>
                {row.planCount} gói
                {row.primaryPriceLabel ? <div className="text-xs">{row.primaryPriceLabel}</div> : null}
              </AdminTd>
              <AdminTd>{row.latestReleaseVersion ?? "—"}</AdminTd>
              <AdminTd>{formatDate(row.updatedAt)}</AdminTd>
              <AdminTd>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  <Link className="text-khepree-teal underline" href={`/products/${row.id}`}>
                    Sửa
                  </Link>
                  <Link className="text-khepree-teal underline" href={previewUrl} target="_blank" rel="noopener noreferrer">
                    Xem trước
                  </Link>
                  {canWrite && row.status === "draft" ? (
                    <Link className="text-khepree-slate/70 underline" href={`/products/${row.id}`}>
                      Xuất bản
                    </Link>
                  ) : null}
                </div>
              </AdminTd>
            </tr>
          );
        })}
      </AdminTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} q={q} />
    </div>
  );
}
