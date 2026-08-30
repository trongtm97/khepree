import { ADMIN_PAGE_SIZE, listAdminCommissions } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import type { Metadata } from "next";
import { commissionAction } from "@/app/(admin)/actions";
import { AdminPageHeader, AdminStatusBadge, AdminTable, AdminTd, statusTone } from "@/components/admin";
import { ActionForm } from "@/components/action-form";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { labelStatus } from "@/lib/labels";
import { formatMoney, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Hoa hồng" };

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requireAdmin("finance.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "finance.write");
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const rows = await listAdminCommissions({ q, page });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Hoa hồng" description="Duyệt, giải phóng và thanh toán hoa hồng đại lý." />
      <SearchForm q={q} />
      <AdminTable headers={["Mã", "Đại lý", "Số tiền", "Trạng thái", ""]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <AdminTd>{row.publicId}</AdminTd>
            <AdminTd>{row.partnerName}</AdminTd>
            <AdminTd>{formatMoney(row.amountMinor, row.currency)}</AdminTd>
            <AdminTd>
              <AdminStatusBadge label={labelStatus(row.status)} tone={statusTone(row.status)} />
            </AdminTd>
            <AdminTd>
              {canWrite ? (
                <div className="flex flex-wrap gap-2">
                  {row.status === "pending" ? (
                    <ActionForm action={commissionAction} submitLabel="Duyệt">
                      <input type="hidden" name="commissionId" value={row.id} />
                      <input type="hidden" name="op" value="approve" />
                    </ActionForm>
                  ) : null}
                  {row.status === "approved" ? (
                    <ActionForm action={commissionAction} submitLabel="Giải phóng">
                      <input type="hidden" name="commissionId" value={row.id} />
                      <input type="hidden" name="op" value="release" />
                    </ActionForm>
                  ) : null}
                  {row.status === "available" ? (
                    <ActionForm action={commissionAction} submitLabel="Thanh toán">
                      <input type="hidden" name="commissionId" value={row.id} />
                      <input type="hidden" name="op" value="pay" />
                    </ActionForm>
                  ) : null}
                </div>
              ) : null}
            </AdminTd>
          </tr>
        ))}
      </AdminTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} q={q} />
    </div>
  );
}
