import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";
import { accountLocaleFromCookies } from "@/lib/locale";
import { accountMessages } from "@/lib/messages";
import type { Metadata } from "next";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await accountLocaleFromCookies();
  return { title: accountMessages(locale).auth.meta.verifyEmail };
}

export default async function VerifyEmailPage() {
  const locale = await accountLocaleFromCookies();
  const copy = accountMessages(locale);

  return (
    <Suspense fallback={<p className="text-sm text-khepree-slate/70">{copy.auth.loading}</p>}>
      <VerifyEmailPanel copy={copy.auth} />
    </Suspense>
  );
}
