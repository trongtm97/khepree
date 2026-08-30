import { Badge, Card, CardDescription, CardTitle } from "@khepree/ui";
import type { Metadata } from "next";
import { PartnerEmpty } from "@/components/partner-empty";
import { formatMoney } from "@/lib/format";
import { getPartnerService } from "@/lib/partner";
import { requirePartnerContext } from "@/lib/partner-session";

export const metadata: Metadata = { title: "Commissions" };

export default async function CommissionsPage({
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
  const rows = await getPartnerService().listCommissions(session.user.id, actor.partner.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Commissions</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          First-touch signup attribution only. Partners cannot approve or pay their own commissions.
        </p>
      </header>
      {rows.length === 0 ? (
        <PartnerEmpty
          title="No commissions"
          description="A commission is created after a referred customer pays, and only if signup was attributed first."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-base">{formatMoney(row.amountMinor, row.currency)}</CardTitle>
                <Badge variant={row.status === "paid" ? "teal" : "outline"}>{row.status}</Badge>
              </div>
              <CardDescription className="mt-2">{row.publicId}</CardDescription>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
