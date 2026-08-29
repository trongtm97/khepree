import { Card, CardDescription, CardTitle, Input } from "@khepree/ui";
import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { PartnerEmpty } from "@/components/partner-empty";
import { createReferralAction } from "@/app/(partner)/actions";
import { getPartnerService } from "@/lib/partner";
import { requirePartnerContext } from "@/lib/partner-session";

export const metadata: Metadata = { title: "Referrals" };

export default async function ReferralsPage() {
  const { session, actor } = await requirePartnerContext();
  if (!actor) {
    return (
      <PartnerEmpty
        title="No partner membership"
        description="This account is not linked to a partner organization."
      />
    );
  }
  const codes = await getPartnerService().listReferrals(session.user.id, actor.partner.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Referrals</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          Attribution is first-touch signup, not last-click. Clicks store a hash of a visitor token — no IP or user
          agent. Order commission requires that signup.
        </p>
      </header>
      {actor.partner.modes.includes("REFERRAL") ? (
        <ActionForm action={createReferralAction} submitLabel="Create referral code">
          <Input name="label" label="Label (optional)" />
        </ActionForm>
      ) : null}
      {codes.length === 0 ? (
        <PartnerEmpty
          title="No referral codes"
          description="Create a code to share. The public landing records a hashed click, then sends the visitor to sign up."
        />
      ) : (
        <div className="space-y-3">
          {codes.map((row) => (
            <Card key={row.id}>
              <CardTitle className="font-mono text-base">{row.code}</CardTitle>
              <CardDescription className="mt-2">
                {row.label ?? "Untitled"} · {row.clicks} clicks · {row.signups} signups · {row.orders} orders
              </CardDescription>
              <p className="mt-3 break-all text-sm text-khepree-teal">{row.link}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
