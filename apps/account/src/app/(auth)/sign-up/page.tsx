import { isGoogleAuthConfigured } from "@khepree/auth/google";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { accountLocaleFromCookies } from "@/lib/locale";
import { accountMessages } from "@/lib/messages";
import type { Metadata } from "next";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await accountLocaleFromCookies();
  return { title: accountMessages(locale).auth.meta.signUp };
}

export default async function SignUpPage() {
  const locale = await accountLocaleFromCookies();
  const copy = accountMessages(locale);

  return (
    <Suspense fallback={<p className="text-sm text-khepree-slate/70">{copy.auth.loading}</p>}>
      <SignUpForm copy={copy.auth} googleEnabled={isGoogleAuthConfigured()} locale={locale} />
    </Suspense>
  );
}
