import { ADMIN_PAGE_SIZE, listAdminDevices } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import type { Metadata } from "next";
import { blockDeviceAction } from "@/app/(admin)/actions";
import {
  AdminPageHeader,
  AdminStatusBadge,
  AdminTable,
  AdminTd,
  AdminTechnicalDetails,
  statusTone,
} from "@/components/admin";
import { ActionForm } from "@/components/action-form";
import { DangerFields } from "@/components/danger-fields";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { labelStatus } from "@/lib/labels";
import { formatDate, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Thiết bị" };

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requireAdmin("entitlement.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "entitlement.admin");
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const rows = await listAdminDevices({ q, page });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Thiết bị" description="Thiết bị đã kích hoạt bản quyền." />
      <SearchForm q={q} />
      <AdminTable headers={["Thiết bị", "Chủ sở hữu", "Trạng thái", "Nền tảng", "Lần cuối", ""]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <AdminTd>{row.publicId}</AdminTd>
            <AdminTd>
              {row.principalType}
              <AdminTechnicalDetails>{row.principalId}</AdminTechnicalDetails>
            </AdminTd>
            <AdminTd>
              <AdminStatusBadge label={labelStatus(row.status)} tone={statusTone(row.status)} />
            </AdminTd>
            <AdminTd>{row.platform ?? "—"}</AdminTd>
            <AdminTd>{formatDate(row.lastSeenAt)}</AdminTd>
            <AdminTd>
              {canWrite && row.status !== "blocked" ? (
                <ActionForm action={blockDeviceAction} submitLabel="Chặn" danger>
                  <input type="hidden" name="devicePublicId" value={row.publicId} />
                  <DangerFields />
                </ActionForm>
              ) : null}
            </AdminTd>
          </tr>
        ))}
      </AdminTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} q={q} />
    </div>
  );
}
