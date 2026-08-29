import { Card, CardDescription, CardTitle, EmptyState } from "@khepree/ui";
import { getAdminDashboard } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await requireAdmin();
  const data = await getAdminDashboard();
  const canFinance = hasPermission({ globalRole: session.globalRole }, "finance.read");
  const revenue =
    data.revenueMinorByCurrency.length === 0
      ? "—"
      : data.revenueMinorByCurrency
          .map((row) => formatMoney(row.amountMinor, row.currency))
          .join(" · ");

  const cards = [
    { href: "/users", title: "Users", value: String(data.userCount), show: true },
    {
      href: "/entitlements",
      title: "Active entitlements",
      value: String(data.activeEntitlementCount),
      show: true,
    },
    {
      href: "/orders",
      title: "Orders",
      value: canFinance ? `${data.orderCount} · ${revenue}` : String(data.orderCount),
      show: true,
    },
    { href: "/licenses", title: "Licenses", value: String(data.licenseCount), show: true },
    { href: "/partners", title: "Partners", value: String(data.partnerCount), show: true },
    {
      href: "/system",
      title: "Succeeded payments",
      value: String(data.succeededPaymentCount),
      show: canFinance,
    },
  ].filter((card) => card.show);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">Live counts from the database. No placeholder metrics.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.title} href={card.href} className="group block">
            <Card className="h-full">
              <CardTitle>{card.title}</CardTitle>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{card.value}</p>
              <CardDescription className="mt-2">Open {card.title.toLowerCase()}</CardDescription>
            </Card>
          </Link>
        ))}
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent system events</h2>
        {data.recentSystemEvents.length === 0 ? (
          <EmptyState title="No system events" description="Operational events appear here when recorded." />
        ) : (
          <ul className="space-y-2 text-sm">
            {data.recentSystemEvents.map((row) => (
              <li key={row.id}>
                {formatDate(row.createdAt)} · {row.severity} · {row.eventType}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent audit</h2>
        {data.recentAudit.length === 0 ? (
          <EmptyState title="No audit rows yet" />
        ) : (
          <ul className="space-y-2 text-sm">
            {data.recentAudit.map((row) => (
              <li key={row.id}>
                {formatDate(row.createdAt)} · {row.action} · {row.resourceType} {row.resourceId ?? ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
