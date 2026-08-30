"use client";

import { BrandLogo, Button, cn, Container } from "@khepree/ui";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { AdminNavList } from "@/components/admin/admin-nav-list";
import { adminUi } from "@/lib/labels";
import type { AdminNavGroup } from "@/lib/routes";
import { authClient } from "@/lib/auth-client";

export function AdminAppShell({
  children,
  userName,
  userEmail,
  role,
  navGroups,
}: {
  children: ReactNode;
  userName: string;
  userEmail: string;
  role: string;
  navGroups: AdminNavGroup[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const drawerRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    drawerRef.current?.close();
  }, [pathname]);

  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  function openDrawer() {
    drawerRef.current?.showModal();
  }

  function closeDrawer() {
    drawerRef.current?.close();
  }

  return (
    <div className="flex min-h-screen flex-col bg-khepree-cloud">
      <header className="border-b border-khepree-mist bg-khepree-white">
        <Container className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              ref={menuButtonRef}
              type="button"
              className="rounded-[var(--radius-control)] p-2 text-khepree-ink hover:bg-khepree-mist md:hidden"
              aria-controls="admin-mobile-nav"
              aria-label={adminUi.openMenu}
              onClick={openDrawer}
            >
              <span aria-hidden="true" className="block text-lg leading-none">
                ☰
              </span>
            </button>
            <Link href="/dashboard">
              <BrandLogo size="sm" />
            </Link>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-khepree-indigo sm:inline">{role}</span>
            <span className="hidden text-khepree-slate/70 sm:inline">{userName || userEmail}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => void signOut()}>
              {adminUi.signOut}
            </Button>
          </div>
        </Container>
      </header>

      <dialog
        id="admin-mobile-nav"
        ref={drawerRef}
        aria-label={adminUi.navLabel}
        onClose={() => menuButtonRef.current?.focus()}
        className={cn(
          "fixed inset-y-0 left-0 m-0 h-full max-h-full w-[min(100%,18rem)] max-w-none border-r border-khepree-mist bg-khepree-white p-0 shadow-xl backdrop:bg-khepree-ink/40",
          "open:animate-in open:slide-in-from-left motion-reduce:open:animate-none",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-khepree-mist px-4">
          <span className="font-semibold">Menu</span>
          <button
            type="button"
            className="rounded-[var(--radius-control)] px-2 py-1 text-khepree-slate hover:bg-khepree-mist"
            aria-label={adminUi.closeMenu}
            onClick={closeDrawer}
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-3">
          <AdminNavList groups={navGroups} onNavigate={closeDrawer} />
        </div>
      </dialog>

      <div className="flex flex-1">
        <aside
          aria-label={adminUi.navLabel}
          className="hidden w-56 shrink-0 overflow-y-auto border-r border-khepree-mist bg-khepree-white p-3 md:block"
        >
          <AdminNavList groups={navGroups} />
        </aside>
        <main className="min-w-0 flex-1">
          <Container className="py-8">{children}</Container>
        </main>
      </div>
    </div>
  );
}
