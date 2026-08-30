import { BrandLogo, Container } from "@khepree/ui";
import { marketingPublicUrl } from "@khepree/config";
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-khepree-cloud">
      <header className="border-b border-khepree-mist bg-khepree-white py-4">
        <Container className="flex items-center justify-between">
          <Link href="/sign-in">
            <BrandLogo />
          </Link>
          <a
            href={marketingPublicUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-khepree-slate/70 hover:text-khepree-ink"
          >
            Khepree.com
          </a>
        </Container>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
