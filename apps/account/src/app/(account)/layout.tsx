import { requireSession } from "@khepree/auth/session";
import { AccountAppShell } from "@/components/account-app-shell";
import { accountLocaleFromCookies } from "@/lib/locale";
import { accountMessages } from "@/lib/messages";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const locale = await accountLocaleFromCookies(session.locale);
  const copy = accountMessages(locale);

  return (
    <AccountAppShell
      userName={session.user.name}
      userEmail={session.user.email}
      locale={locale}
      copy={copy}
    >
      {children}
    </AccountAppShell>
  );
}
