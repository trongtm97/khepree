import { ADMIN_PAGE_SIZE, listAdminAudit } from "@khepree/db";
import type { Metadata } from "next";
import { AdminPageHeader, AdminTable, AdminTd, AdminTechnicalDetails } from "@/components/admin";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdminAny } from "@/lib/admin-session";
import { formatDate, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Nhật ký hoạt động" };

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdminAny(["support.read", "finance.read"]);
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const rows = await listAdminAudit({ q, page });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Nhật ký hoạt động"
        description="Chỉ thêm mới. Trang này không thể sửa hoặc xóa bản ghi."
      />
      <SearchForm q={q} />
      <AdminTable headers={["Thời gian", "Người thực hiện", "Hành động", "Tài nguyên", "IP"]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <AdminTd>{formatDate(row.createdAt)}</AdminTd>
            <AdminTd>
              Nhân viên
              {row.actorUserId ? <AdminTechnicalDetails>{row.actorUserId}</AdminTechnicalDetails> : null}
            </AdminTd>
            <AdminTd>{row.action}</AdminTd>
            <AdminTd>
              {row.resourceType}
              {row.resourceId ? <AdminTechnicalDetails>{row.resourceId}</AdminTechnicalDetails> : null}
            </AdminTd>
            <AdminTd>{row.ipAddress ?? "—"}</AdminTd>
          </tr>
        ))}
      </AdminTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} q={q} />
    </div>
  );
}
