import { BrandLogo, Container } from "@khepree/ui";
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-khepree-cloud">
      <header className="border-b border-khepree-mist bg-khepree-white py-4">
        <Container className="flex justify-center">
          <Link href="/sign-in">
            <BrandLogo />
          </Link>
        </Container>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
