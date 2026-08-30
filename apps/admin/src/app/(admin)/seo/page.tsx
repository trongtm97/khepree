import { listAdminContent } from "@khepree/db";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader, AdminSection, AdminTable, AdminTd } from "@/components/admin";
import { requireAdmin } from "@/lib/admin-session";
import { getProductStudio } from "@/lib/product-studio";

export const metadata: Metadata = { title: "SEO" };

export default async function SeoManagerPage() {
  await requireAdmin("content.read");
  const studio = getProductStudio();
  const products = await studio.listSummaries({ page: 1, pageSize: 50 });
  const content = await listAdminContent({ page: 1 });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="SEO"
        description="Trạng thái SEO thật của sản phẩm và nội dung đã xuất bản. Không tạo hreflang giả."
      />
      <AdminSection title="Sản phẩm">
        <AdminTable headers={["Sản phẩm", "SEO", "Sẵn sàng"]} empty={products.length === 0}>
          {products.map((row) => (
            <tr key={row.id}>
              <AdminTd>
                <Link className="text-khepree-teal underline" href={`/products/${row.id}?tab=seo`}>
                  {row.nameVi ?? row.slug}
                </Link>
              </AdminTd>
              <AdminTd>{row.seoOk ? "Đủ" : "Thiếu"}</AdminTd>
              <AdminTd>{row.readiness.ready ? "Sẵn sàng" : `${row.readiness.blockingCount} mục`}</AdminTd>
            </tr>
          ))}
        </AdminTable>
      </AdminSection>
      <AdminSection title="Nội dung">
        <AdminTable headers={["Tiêu đề", "Locale", "SEO title", "Trạng thái"]} empty={content.length === 0}>
          {content.map((row) => (
            <tr key={row.versionId}>
              <AdminTd>
                <Link className="text-khepree-teal underline" href={`/content/${row.entryId}`}>
                  {row.title}
                </Link>
              </AdminTd>
              <AdminTd>{row.locale}</AdminTd>
              <AdminTd>{row.seoTitle ?? "—"}</AdminTd>
              <AdminTd>{row.status}</AdminTd>
            </tr>
          ))}
        </AdminTable>
      </AdminSection>
    </div>
  );
}
