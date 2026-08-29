import { Card, CardDescription, CardTitle } from "@khepree/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { PartnerEmpty } from "@/components/partner-empty";
import { formatMoney } from "@/lib/format";
import { getPartnerService } from "@/lib/partner";
import { requirePartnerContext } from "@/lib/partner-session";
import { PROTECTED_ROUTES } from "@/lib/routes";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { session, actor } = await requirePartnerContext();
  if (!actor) {
    return (
      <PartnerEmpty
        title="No partner membership"
        description="This account is not linked to a partner organization. Ask Khepree to attach your user after you sign up."
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
    { href: PROTECTED_ROUTES.customers, title: "Customers", value: String(overview.customerCount) },
    { href: PROTECTED_ROUTES.licenses, title: "Active licenses", value: String(overview.activeLicenseCount) },
    { href: PROTECTED_ROUTES.orders, title: "Issues", value: String(overview.issueCount) },
    {
      href: PROTECTED_ROUTES.wallet,
      title: "Wallet",
      value: formatMoney(overview.walletBalanceMinor, overview.walletCurrency),
    },
    {
      href: PROTECTED_ROUTES.commissions,
      title: "Pending commissions",
      value: String(overview.pendingCommissionCount),
    },
    { href: PROTECTED_ROUTES.referrals, title: "Referral signups", value: String(overview.signupCount) },
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
