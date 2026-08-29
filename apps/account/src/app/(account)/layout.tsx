import { requireSession } from "@khepree/auth/session";
import { AccountAppShell } from "@/components/account-app-shell";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return (
    <AccountAppShell userName={session.user.name} userEmail={session.user.email}>
      {children}
    </AccountAppShell>
  );
}
