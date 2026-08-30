import { Card, CardDescription, CardTitle } from "@khepree/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { PartnerEmpty } from "@/components/partner-empty";
import { formatMoney } from "@/lib/format";
import { getPartnerService } from "@/lib/partner";
import { requirePartnerContext } from "@/lib/partner-session";
import { partnerPath } from "@/lib/routes";

export const metadata: Metadata = { title: "Dashboard" };

export default async function PartnerScopedDashboardPage({
  params,
}: {
  params: Promise<{ partnerPublicId: string }>;
}) {
  const { partnerPublicId } = await params;
  const { session, actor } = await requirePartnerContext(partnerPublicId);
  if (!actor) {
    return (
      <PartnerEmpty
        title="No partner membership"
        description="This account cannot access that partner organization."
      />
    );
  }

  const overview = await getPartnerService().overview(session.user.id, actor.partner.id);
  const empty =
    overview.customerCount === 0 &&
    overview.issueCount === 0 &&
    overview.referralCodeCount === 0 &&
    overview.walletBalanceMinor === 0n;

  const cards = [
    { href: partnerPath(partnerPublicId, "customers"), title: "Customers", value: String(overview.customerCount) },
    { href: partnerPath(partnerPublicId, "licenses"), title: "Active licenses", value: String(overview.activeLicenseCount) },
    { href: partnerPath(partnerPublicId, "orders"), title: "Issues", value: String(overview.issueCount) },
    {
      href: partnerPath(partnerPublicId, "wallet"),
      title: "Wallet",
      value: formatMoney(overview.walletBalanceMinor, overview.walletCurrency),
    },
    {
      href: partnerPath(partnerPublicId, "commissions"),
      title: "Pending commissions",
      value: String(overview.pendingCommissionCount),
    },
    { href: partnerPath(partnerPublicId, "referrals"), title: "Referral signups", value: String(overview.signupCount) },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{actor.partner.name}</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          Status {actor.partner.status} · {actor.partner.modes.join(", ")} · {actor.role}
        </p>
      </header>
      {empty ? (
        <PartnerEmpty
          title="Nothing to report yet"
          description="Counts stay at zero until you add customers, issue licenses, or share a referral link. No placeholder charts."
        />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="group block">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardTitle>{card.title}</CardTitle>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{card.value}</p>
              <CardDescription className="mt-2">Open {card.title.toLowerCase()}</CardDescription>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
