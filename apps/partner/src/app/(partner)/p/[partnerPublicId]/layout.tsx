import { PartnerAppShell } from "@/components/partner-app-shell";
import { requirePartnerContext } from "@/lib/partner-session";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function ScopedPartnerLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ partnerPublicId: string }>;
}) {
  const { partnerPublicId } = await params;
  const { session, actor } = await requirePartnerContext(partnerPublicId);
  if (!actor) redirect("/select");

  return (
    <PartnerAppShell
      userName={session.user.name}
      userEmail={session.user.email}
      partnerName={actor.partner.name}
      partnerPublicId={actor.partner.publicId}
    >
      {children}
    </PartnerAppShell>
  );
}
