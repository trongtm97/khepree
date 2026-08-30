import { AuthLayout } from "@/components/auth-layout";
import { accountLocaleFromCookies } from "@/lib/locale";
import { accountMessages } from "@/lib/messages";
import type { ReactNode } from "react";

export default async function PublicAuthLayout({ children }: { children: ReactNode }) {
  const locale = await accountLocaleFromCookies();
  const copy = accountMessages(locale);

  return <AuthLayout copy={copy.auth}>{children}</AuthLayout>;
}
