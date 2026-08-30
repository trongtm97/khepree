import { ADMIN_PAGE_SIZE, listAdminLicenses } from "@khepree/db";
import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminPageHeader,
  AdminStatusBadge,
  AdminTable,
  AdminTd,
  AdminTechnicalDetails,
  statusTone,
} from "@/components/admin";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { labelStatus } from "@/lib/labels";
import { formatDate, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Bản quyền" };

export default async function LicensesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin("entitlement.read");
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const rows = await listAdminLicenses({ q, page });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Bản quyền" description="Khóa bản quyền và trạng thái kích hoạt." />
      <SearchForm q={q} />
      <AdminTable headers={["Bản quyền", "Khóa", "Trạng thái", "Chủ sở hữu", "Ngày tạo"]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <AdminTd>
              <Link className="text-khepree-teal underline" href={`/licenses/${row.publicId}`}>
                {row.publicId}
              </Link>
            </AdminTd>
            <AdminTd>
              {row.keyPrefix}…{row.keyLast4}
            </AdminTd>
            <AdminTd>
              <AdminStatusBadge label={labelStatus(row.status)} tone={statusTone(row.status)} />
            </AdminTd>
            <AdminTd>
              {row.entitlementPublicId}
              <AdminTechnicalDetails>{row.principalId}</AdminTechnicalDetails>
            </AdminTd>
            <AdminTd>{formatDate(row.createdAt)}</AdminTd>
          </tr>
        ))}
      </AdminTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} q={q} />
    </div>
  );
}
