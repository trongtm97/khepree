import { BrandLogo } from "../components/brand-logo";
import { Container } from "../components/container";
import type { ReactNode } from "react";

export interface PublicShellProps {
  children: ReactNode;
}

export function PublicShell({ children }: PublicShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-khepree-mist bg-khepree-white/90 backdrop-blur-md">
        <Container className="flex h-16 items-center justify-between">
          <BrandLogo />
          <nav aria-label="Primary" className="hidden items-center gap-6 text-sm md:flex">
            <span className="text-khepree-slate/50">Products</span>
            <span className="text-khepree-slate/50">Pricing</span>
          </nav>
        </Container>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-khepree-mist bg-khepree-white py-8">
        <Container>
          <p className="text-xs text-khepree-slate/50">© {new Date().getFullYear()} Khepree</p>
        </Container>
      </footer>
    </div>
  );
}
