import { getAdminDashboard } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import type { Metadata } from "next";
import { AdminEmptyState } from "@/components/admin";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSection } from "@/components/admin/admin-section";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Tổng quan" };

export default async function DashboardPage() {
  const session = await requireAdmin();
  const data = await getAdminDashboard();
  const canFinance = hasPermission({ globalRole: session.globalRole }, "finance.read");
  const revenue =
    data.revenueMinorByCurrency.length === 0
      ? "—"
      : data.revenueMinorByCurrency.map((row) => formatMoney(row.amountMinor, row.currency)).join(" · ");

  const cards = [
    { href: "/users", title: "Người dùng", value: String(data.userCount), show: true },
    {
      href: "/entitlements",
      title: "Quyền sử dụng đang hoạt động",
      value: String(data.activeEntitlementCount),
      show: true,
    },
    {
      href: "/orders",
      title: "Đơn hàng",
      value: canFinance ? `${data.orderCount} · ${revenue}` : String(data.orderCount),
      show: true,
    },
    { href: "/licenses", title: "Bản quyền", value: String(data.licenseCount), show: true },
    { href: "/partners", title: "Đại lý", value: String(data.partnerCount), show: true },
    {
      href: "/payments",
      title: "Thanh toán thành công",
      value: String(data.succeededPaymentCount),
      show: canFinance,
    },
  ].filter((card) => card.show);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Tổng quan"
        description="Số liệu thực từ cơ sở dữ liệu. Không có số liệu giả lập."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <AdminStatCard
            key={card.title}
            href={card.href}
            title={card.title}
            value={card.value}
            description={`Mở ${card.title.toLowerCase()}`}
          />
        ))}
      </div>
      <AdminSection title="Sự kiện hệ thống gần đây">
        {data.recentSystemEvents.length === 0 ? (
          <AdminEmptyState title="Chưa có sự kiện" description="Sự kiện vận hành sẽ hiển thị tại đây." />
        ) : (
          <ul className="space-y-2 text-sm">
            {data.recentSystemEvents.map((row) => (
              <li key={row.id}>
                {formatDate(row.createdAt)} · {row.severity} · {row.eventType}
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
      <AdminSection title="Nhật ký hoạt động gần đây">
        {data.recentAudit.length === 0 ? (
          <AdminEmptyState title="Chưa có nhật ký" />
        ) : (
          <ul className="space-y-2 text-sm">
            {data.recentAudit.map((row) => (
              <li key={row.id}>
                {formatDate(row.createdAt)} · {row.action} · {row.resourceType}
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </div>
  );
}
