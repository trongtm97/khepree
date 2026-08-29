import { Badge, Card, CardDescription, CardTitle } from "@khepree/ui";
import type { Metadata } from "next";
import { PartnerEmpty } from "@/components/partner-empty";
import { formatMoney } from "@/lib/format";
import { getPartnerService } from "@/lib/partner";
import { requirePartnerContext } from "@/lib/partner-session";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage() {
  const { session, actor } = await requirePartnerContext();
  if (!actor) {
    return (
      <PartnerEmpty
        title="No partner membership"
        description="This account is not linked to a partner organization."
      />
    );
  }
  const issues = await getPartnerService().listIssues(session.user.id, actor.partner.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          Reseller issues and renewals billed against the partner wallet.
        </p>
      </header>
      {issues.length === 0 ? (
        <PartnerEmpty
          title="No partner orders"
          description="Issuing or renewing a license records a transaction here."
        />
      ) : (
        <div className="space-y-3">
          {issues.map(({ issue, entitlement }) => (
            <Card key={issue.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-base">{issue.kind}</CardTitle>
                <Badge variant="outline">{issue.publicId}</Badge>
              </div>
              <CardDescription className="mt-2">
                {formatMoney(issue.amountMinor, issue.currency)}
                {entitlement?.expiresAt
                  ? ` · entitlement expires ${entitlement.expiresAt.toISOString().slice(0, 10)}`
                  : ""}
              </CardDescription>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
