import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { accountLocaleFromCookies } from "@/lib/locale";
import { accountMessages } from "@/lib/messages";
import type { Metadata } from "next";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await accountLocaleFromCookies();
  return { title: accountMessages(locale).auth.meta.resetPassword };
}

export default async function ResetPasswordPage() {
  const locale = await accountLocaleFromCookies();
  const copy = accountMessages(locale);

  return (
    <Suspense fallback={<p className="text-sm text-khepree-slate/70">{copy.auth.loading}</p>}>
      <ResetPasswordForm copy={copy.auth} />
    </Suspense>
  );
}
