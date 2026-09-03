import { isGoogleAuthConfigured } from "@khepree/auth/google";
import { safeAccountNextPath } from "@khepree/auth/safe-account-next-path";
import { getSession } from "@khepree/auth/session";
import { SignInForm } from "@/components/auth/sign-in-form";
import { accountLocaleFromCookies } from "@/lib/locale";
import { accountMessages } from "@/lib/messages";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await accountLocaleFromCookies();
  return { title: accountMessages(locale).auth.meta.signIn };
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) {
    const params = await searchParams;
    redirect(safeAccountNextPath(params.next));
  }

  const locale = await accountLocaleFromCookies();
  const copy = accountMessages(locale);

  return (
    <Suspense fallback={<p className="text-sm text-khepree-slate/70">{copy.auth.loading}</p>}>
      <SignInForm copy={copy.auth} googleEnabled={isGoogleAuthConfigured()} locale={locale} />
    </Suspense>
  );
}
