import { Badge, Card, CardDescription, CardTitle, Select } from "@khepree/ui";
import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { PartnerEmpty } from "@/components/partner-empty";
import { issueProductAction, renewIssueAction } from "@/app/(partner)/actions";
import { formatMoney } from "@/lib/format";
import { getPartnerService } from "@/lib/partner";
import { requirePartnerContext } from "@/lib/partner-session";

export const metadata: Metadata = { title: "Licenses" };

export default async function LicensesPage() {
  const { session, actor } = await requirePartnerContext();
  if (!actor) {
    return (
      <PartnerEmpty
        title="No partner membership"
        description="This account is not linked to a partner organization."
      />
    );
  }
  const partner = getPartnerService();
  const [issues, customers, products] = await Promise.all([
    partner.listIssues(session.user.id, actor.partner.id),
    partner.listCustomers(session.user.id, actor.partner.id),
    partner.listProducts(session.user.id, actor.partner.id),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Licenses</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          Issue and renew go through the entitlement service. This page cannot write the entitlement table.
        </p>
      </header>
      {actor.partner.modes.includes("RESELLER") && customers.length > 0 && products.length > 0 ? (
        <ActionForm action={issueProductAction} submitLabel="Issue license">
          <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
          <Select
            name="customerUserId"
            label="Customer"
            required
            options={customers.map((row) => ({
              value: row.userId,
              label: row.email ?? row.userId,
            }))}
          />
          <Select
            name="planId"
            label="Plan"
            required
            options={products.map((row) => ({
              value: row.planId,
              label: `${row.plan?.slug ?? row.planId} · ${formatMoney(row.amountMinor, row.currency)}`,
            }))}
          />
        </ActionForm>
      ) : null}
      {issues.length === 0 ? (
        <PartnerEmpty
          title="No licenses issued"
          description="Fund the wallet, add a customer, then issue a priced plan."
        />
      ) : (
        <div className="space-y-3">
          {issues.map(({ issue, entitlement }) => (
            <Card key={issue.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-base">{issue.publicId}</CardTitle>
                <Badge variant={entitlement?.status === "active" ? "teal" : "outline"}>
                  {entitlement?.status ?? "unknown"}
                </Badge>
              </div>
              <CardDescription className="mt-2">
                {issue.kind} · {formatMoney(issue.amountMinor, issue.currency)}
                {entitlement?.expiresAt
                  ? ` · expires ${entitlement.expiresAt.toISOString().slice(0, 10)}`
                  : " · no expiration"}
              </CardDescription>
              {issue.kind === "issue" ? (
                <div className="mt-4">
                  <ActionForm action={renewIssueAction} submitLabel="Renew">
                    <input type="hidden" name="issueId" value={issue.id} />
                    <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
                  </ActionForm>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
