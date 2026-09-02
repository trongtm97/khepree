import { listAdminProductsForPicker } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminEmptyState,
  AdminFilterBar,
  AdminPageHeader,
  AdminPagination,
  AdminStatusBadge,
  AdminTable,
  AdminTd,
  statusTone,
} from "@/components/admin";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate, parsePage } from "@/lib/format";
import { adminUi, labelStatus } from "@/lib/labels";
import { getAnnouncementService } from "@/lib/announcement-service";

export const metadata: Metadata = { title: "Thông báo hệ thống" };

const severityLabels: Record<string, string> = {
  info: "Thông tin",
  success: "Thành công",
  warning: "Cảnh báo",
  error: "Lỗi",
  action_required: "Cần thao tác",
};

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    productId?: string;
    status?: string;
    severity?: string;
    platform?: string;
    channel?: string;
    schedule?: string;
    page?: string;
  }>;
}) {
  const session = await requireAdmin("catalog.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "catalog.write");
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const products = await listAdminProductsForPicker();

  const { items, hasMore } = await getAnnouncementService().listForAdmin({
    productId: sp.productId || null,
    status: (sp.status as "draft" | "published" | "expired" | "archived" | undefined) || null,
    severity: (sp.severity as "info" | "success" | "warning" | "error" | "action_required" | undefined) || null,
    platform: (sp.platform as "windows" | "macos" | "linux" | undefined) || null,
    channel: (sp.channel as "stable" | "beta" | "alpha" | undefined) || null,
    schedule: (sp.schedule as "active" | "expired" | "all" | undefined) || null,
    page,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Thông báo hệ thống"
        description="Broadcast tới desktop client — targeting theo sản phẩm, nền tảng và phiên bản."
        actions={
          canWrite ? (
            <Link
              href="/announcements/new"
              className="rounded-[var(--radius-control)] bg-khepree-teal px-3 py-2 text-sm font-medium text-white"
            >
              Tạo thông báo
            </Link>
          ) : (
            <span className="text-sm text-khepree-slate/60">{adminUi.readOnly}</span>
          )
        }
      />

      <AdminFilterBar
        extra={[
          {
            name: "productId",
            label: "Sản phẩm",
            type: "select",
            defaultValue: sp.productId,
            options: [
              { value: "", label: adminUi.all },
              ...products.map((p) => ({ value: p.id, label: p.nameVi ?? p.slug })),
            ],
          },
          {
            name: "status",
            label: adminUi.status,
            type: "select",
            defaultValue: sp.status,
            options: [
              { value: "", label: adminUi.all },
              { value: "draft", label: labelStatus("draft") },
              { value: "published", label: labelStatus("published") },
              { value: "expired", label: "Hết hạn" },
              { value: "archived", label: labelStatus("archived") },
            ],
          },
          {
            name: "severity",
            label: "Mức độ",
            type: "select",
            defaultValue: sp.severity,
            options: [
              { value: "", label: adminUi.all },
              ...Object.entries(severityLabels).map(([value, label]) => ({ value, label })),
            ],
          },
          {
            name: "platform",
            label: "Nền tảng",
            type: "select",
            defaultValue: sp.platform,
            options: [
              { value: "", label: adminUi.all },
              { value: "windows", label: "Windows" },
              { value: "macos", label: "macOS" },
              { value: "linux", label: "Linux" },
            ],
          },
          {
            name: "channel",
            label: "Kênh",
            type: "select",
            defaultValue: sp.channel,
            options: [
              { value: "", label: adminUi.all },
              { value: "stable", label: "Stable" },
              { value: "beta", label: "Beta" },
              { value: "alpha", label: "Alpha" },
            ],
          },
          {
            name: "schedule",
            label: "Lịch",
            type: "select",
            defaultValue: sp.schedule,
            options: [
              { value: "", label: adminUi.all },
              { value: "active", label: "Đang hiển thị" },
              { value: "expired", label: "Đã hết hạn" },
            ],
          },
        ]}
      />

      {items.length === 0 ? (
        <AdminEmptyState title={adminUi.noRows} description={adminUi.noRowsHint} />
      ) : (
        <AdminTable
          headers={[
            "Tiêu đề",
            "Sản phẩm",
            "Mức độ",
            "Trạng thái",
            "Nền tảng",
            "Kênh",
            "Lịch UTC",
            "Cập nhật",
          ]}
        >
          {items.map((row) => (
            <tr key={row.id}>
              <AdminTd>
                <Link className="text-khepree-teal underline" href={`/announcements/${row.publicId}`}>
                  {row.titleVi ?? row.titleEn ?? row.publicId}
                </Link>
              </AdminTd>
              <AdminTd>{row.productLabel ?? "Toàn hệ sinh thái"}</AdminTd>
              <AdminTd>{severityLabels[row.severity] ?? row.severity}</AdminTd>
              <AdminTd>
                <AdminStatusBadge label={labelStatus(row.status)} tone={statusTone(row.status)} />
              </AdminTd>
              <AdminTd>{row.targetPlatform ?? "—"}</AdminTd>
              <AdminTd>{row.releaseChannel ?? "—"}</AdminTd>
              <AdminTd className="text-xs">
                {row.startsAt ? formatDate(row.startsAt) : "—"} → {row.expiresAt ? formatDate(row.expiresAt) : "—"}
              </AdminTd>
              <AdminTd>{formatDate(row.updatedAt)}</AdminTd>
            </tr>
          ))}
        </AdminTable>
      )}

      <AdminPagination
        page={page}
        hasMore={hasMore}
        params={{
          productId: sp.productId,
          status: sp.status,
          severity: sp.severity,
          platform: sp.platform,
          channel: sp.channel,
          schedule: sp.schedule,
        }}
      />
    </div>
  );
}
