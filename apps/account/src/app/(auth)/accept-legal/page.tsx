import { AcceptLegalForm } from "@/components/auth/accept-legal-form";
import { accountLocaleFromCookies } from "@/lib/locale";
import { accountMessages } from "@/lib/messages";
import type { Metadata } from "next";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await accountLocaleFromCookies();
  return { title: accountMessages(locale).auth.meta.acceptLegal };
}

export default async function AcceptLegalPage() {
  const locale = await accountLocaleFromCookies();
  const copy = accountMessages(locale);

  return (
    <Suspense fallback={<p className="text-sm text-khepree-slate/70">{copy.auth.loading}</p>}>
      <AcceptLegalForm copy={copy.auth} locale={locale} />
    </Suspense>
  );
}
