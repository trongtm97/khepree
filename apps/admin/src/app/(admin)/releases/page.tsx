import { listAdminReleases } from "@khepree/db";
import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminPageHeader,
  AdminStatusBadge,
  AdminTable,
  AdminTd,
  statusTone,
} from "@/components/admin";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate } from "@/lib/format";
import { labelStatus } from "@/lib/labels";

export const metadata: Metadata = { title: "Phiên bản" };

export default async function ReleasesPage() {
  await requireAdmin("content.read");
  const rows = await listAdminReleases({ page: 1 });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Phiên bản"
        description="Software releases — liên kết sản phẩm, media riêng tư và metadata phiên bản."
      />
      <AdminTable
        headers={["Sản phẩm", "Version", "Nền tảng", "Arch", "Kênh", "Trạng thái", "Cập nhật"]}
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
              <AdminStatusBadge label={labelStatus(row.status)} tone={statusTone(row.status)} />
            </AdminTd>
            <AdminTd>{formatDate(row.updatedAt)}</AdminTd>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
