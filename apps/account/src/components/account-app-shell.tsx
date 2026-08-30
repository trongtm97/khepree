"use client";

import { BrandLogo, Button, cn, Container } from "@khepree/ui";
import { marketingPublicUrl } from "@khepree/config";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { SupportedLocale } from "@khepree/config";
import { LocaleSwitch } from "@/components/locale-switch";
import { ACCOUNT_NAV } from "@/lib/routes";
import { authClient } from "@/lib/auth-client";
import type { AccountMessages } from "@/lib/messages";

export interface AccountAppShellProps {
  children: ReactNode;
  userName: string;
  userEmail: string;
  locale: SupportedLocale;
  copy: AccountMessages;
}

export function AccountAppShell({
  children,
  userName,
  userEmail,
  locale,
  copy,
}: AccountAppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  const navLabels: Record<(typeof ACCOUNT_NAV)[number]["href"], string> = {
    "/dashboard": copy.nav.dashboard,
    "/products": copy.nav.products,
    "/licenses": copy.nav.licenses,
    "/devices": copy.nav.devices,
    "/billing": copy.nav.billing,
    "/downloads": copy.nav.downloads,
    "/profile": copy.nav.profile,
    "/security": copy.nav.security,
  };

  return (
    <div className="flex min-h-screen flex-col bg-khepree-cloud">
      <header className="border-b border-khepree-mist bg-khepree-white">
        <Container className="flex h-14 items-center justify-between gap-4">
          <Link href={marketingPublicUrl()} target="_blank" rel="noopener noreferrer">
            <BrandLogo context="app" />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <LocaleSwitch locale={locale} />
            <span className="hidden text-khepree-slate/70 sm:inline">{userName || userEmail}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => void signOut()}>
              {copy.nav.signOut}
            </Button>
          </div>
        </Container>
      </header>
      <div className="flex flex-1">
        <aside
          aria-label="Account navigation"
          className="hidden w-56 shrink-0 border-r border-khepree-mist bg-khepree-white p-4 md:block"
        >
          <nav className="flex flex-col gap-1">
            {ACCOUNT_NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-[var(--radius-control)] px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-khepree-mist font-medium text-khepree-ink"
                      : "text-khepree-slate/70 hover:bg-khepree-mist/60 hover:text-khepree-ink",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {navLabels[item.href] ?? item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1">
          <Container className="py-8">{children}</Container>
        </main>
      </div>
    </div>
  );
}
