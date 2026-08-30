import "@khepree/ui/globals.css";
import { GeistSans } from "geist/font/sans";
import { htmlLang } from "@khepree/config";
import type { Metadata } from "next";
import { accountLocaleFromCookies } from "@/lib/locale";

export const metadata: Metadata = {
  title: "Account — Khepree",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await accountLocaleFromCookies();
  return (
    <html lang={htmlLang(locale)} className={GeistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
