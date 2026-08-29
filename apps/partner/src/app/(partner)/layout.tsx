import { PartnerAppShell } from "@/components/partner-app-shell";
import { requirePartnerContext } from "@/lib/partner-session";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function PartnerLayout({ children }: { children: ReactNode }) {
  const { session, actor } = await requirePartnerContext();

  return (
    <PartnerAppShell
      userName={session.user.name}
      userEmail={session.user.email}
      partnerName={actor?.partner.name ?? null}
    >
      {children}
    </PartnerAppShell>
  );
}
