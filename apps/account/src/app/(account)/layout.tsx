import { hasRequiredLegalConsent } from "@khepree/auth/legal-consent";
import { requireSession } from "@khepree/auth/session";
import { safeAccountNextPath } from "@khepree/auth/safe-account-next-path";
import { AccountAppShell } from "@/components/account-app-shell";
import { accountLocaleFromCookies } from "@/lib/locale";
import { accountMessages } from "@/lib/messages";
import { AUTH_ROUTES } from "@/lib/routes";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const consentOk = await hasRequiredLegalConsent(session.user.id);

  if (!consentOk) {
    redirect(`${AUTH_ROUTES.acceptLegal}?next=${encodeURIComponent(safeAccountNextPath("/dashboard"))}`);
  }

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
