import { BrandLogo } from "../components/brand-logo";
import { Container } from "../components/container";
import type { ReactNode } from "react";

const navItems = ["Overview", "Users", "Catalog", "System"];

export interface AdminShellProps {
  children: ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-khepree-ink text-khepree-cloud">
      <header className="border-b border-white/10">
        <Container className="flex h-14 items-center justify-between">
          <BrandLogo variant="light" size="sm" />
          <span className="rounded-full bg-khepree-teal/20 px-2 py-0.5 text-xs text-khepree-teal">
            Admin
          </span>
        </Container>
      </header>
      <div className="flex flex-1">
        <aside
          aria-label="Admin navigation"
          className="hidden w-56 shrink-0 border-r border-white/10 p-4 md:block"
        >
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <span
                key={item}
                className="rounded-[var(--radius-control)] px-3 py-2 text-sm text-khepree-mist/70"
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
