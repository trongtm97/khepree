"use client";

import { BrandLogo, Button, cn, Container } from "@khepree/ui";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

export function AdminAppShell({
  children,
  userName,
  userEmail,
  role,
  nav,
}: {
  children: ReactNode;
  userName: string;
  userEmail: string;
  role: string;
  nav: Array<{ label: string; href: string }>;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-khepree-cloud">
      <header className="border-b border-khepree-mist bg-khepree-white">
        <Container className="flex h-14 items-center justify-between gap-4">
          <Link href="/dashboard">
            <BrandLogo size="sm" />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-khepree-indigo sm:inline">{role}</span>
            <span className="hidden text-khepree-slate/70 sm:inline">{userName || userEmail}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </Container>
      </header>
      <div className="flex flex-1">
        <aside
          aria-label="Admin navigation"
          className="hidden w-56 shrink-0 overflow-y-auto border-r border-khepree-mist bg-khepree-white p-3 md:block"
        >
          <nav className="flex flex-col gap-0.5">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-[var(--radius-control)] px-3 py-1.5 text-sm transition-colors",
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
        <main className="min-w-0 flex-1">
          <Container className="py-8">{children}</Container>
        </main>
      </div>
    </div>
  );
}
