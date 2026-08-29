import { BrandLogo } from "../components/brand-logo";
import { Container } from "../components/container";
import type { ReactNode } from "react";

const navItems = ["Dashboard", "Products", "Billing", "Settings"];

export interface AccountShellProps {
  children: ReactNode;
}

export function AccountShell({ children }: AccountShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-khepree-cloud">
      <header className="border-b border-khepree-mist bg-khepree-white">
        <Container className="flex h-14 items-center justify-between">
          <BrandLogo size="sm" />
          <span className="text-sm text-khepree-slate/60">Account</span>
        </Container>
      </header>
      <div className="flex flex-1">
        <aside
          aria-label="Account navigation"
          className="hidden w-56 shrink-0 border-r border-khepree-mist bg-khepree-white p-4 md:block"
        >
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <span
                key={item}
                className="rounded-[var(--radius-control)] px-3 py-2 text-sm text-khepree-slate/60"
              >
                {item}
              </span>
            ))}
          </nav>
        </aside>
        <main className="flex-1">
          <Container className="py-8">{children}</Container>
        </main>
      </div>
    </div>
  );
}
