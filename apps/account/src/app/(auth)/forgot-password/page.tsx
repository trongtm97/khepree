import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { accountLocaleFromCookies } from "@/lib/locale";
import { accountMessages } from "@/lib/messages";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await accountLocaleFromCookies();
  return { title: accountMessages(locale).auth.meta.forgotPassword };
}

export default async function ForgotPasswordPage() {
  const locale = await accountLocaleFromCookies();
  const copy = accountMessages(locale);

  return <ForgotPasswordForm copy={copy.auth} />;
}
