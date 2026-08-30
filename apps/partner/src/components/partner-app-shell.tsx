"use client";

import { BrandLogo, Button, cn, Container } from "@khepree/ui";
import { marketingPublicUrl } from "@khepree/config";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { PARTNER_NAV, partnerNav } from "@/lib/routes";

export function PartnerAppShell({
  children,
  userName,
  userEmail,
  partnerName,
  partnerPublicId,
}: {
  children: ReactNode;
  userName: string;
  userEmail: string;
  partnerName: string | null;
  partnerPublicId?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = partnerPublicId ? partnerNav(partnerPublicId) : PARTNER_NAV;
  const homeHref = partnerPublicId ? `/p/${partnerPublicId}/dashboard` : "/select";

  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-khepree-cloud">
      <header className="border-b border-khepree-mist bg-khepree-white">
        <Container className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={homeHref}>
              <BrandLogo context="app" />
            </Link>
            <a
              href={marketingPublicUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden text-sm text-khepree-slate/70 hover:text-khepree-ink sm:inline"
            >
              Khepree.com
            </a>
          </div>
          <div className="hidden items-center gap-3 text-sm sm:flex">
            {partnerName ? (
              <span className="text-khepree-indigo">{partnerName}</span>
            ) : null}
            <span className="text-khepree-slate/70">{userName || userEmail}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </Container>
      </header>
      <div className="flex flex-1">
        <aside
          aria-label="Partner navigation"
          className="hidden w-56 shrink-0 border-r border-khepree-mist bg-khepree-white p-4 md:block"
        >
          <nav className="flex flex-col gap-1">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                  {item.label}
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
