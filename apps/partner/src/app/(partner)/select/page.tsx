import { PartnerAppShell } from "@/components/partner-app-shell";
import { PartnerEmpty } from "@/components/partner-empty";
import { requirePartnerContext } from "@/lib/partner-session";
import { partnerPath } from "@/lib/routes";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Select partner" };

export default async function SelectPartnerPage() {
  const { session, actors } = await requirePartnerContext();
  if (actors.length === 1) {
    redirect(partnerPath(actors[0]!.partner.publicId, "dashboard"));
  }

  const inner =
    actors.length === 0 ? (
      <PartnerEmpty
        title="No partner membership"
        description="This account is not linked to a partner organization."
      />
    ) : (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Select a partner</h1>
        <p className="text-sm text-khepree-slate/70">You belong to more than one partner. Choose one to continue.</p>
        <ul className="space-y-3">
          {actors.map((actor) => (
            <li key={actor.partner.id}>
              <Link
                href={partnerPath(actor.partner.publicId, "dashboard")}
                className="block rounded-lg border border-khepree-mist bg-khepree-white p-4 hover:shadow-md"
              >
                <strong>{actor.partner.name}</strong>
                <span className="mt-1 block text-sm text-khepree-slate/70">{actor.role}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <PartnerAppShell
      userName={session.user.name}
      userEmail={session.user.email}
      partnerName={null}
      partnerPublicId={null}
    >
      {inner}
    </PartnerAppShell>
  );
}
