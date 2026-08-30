import { BrandLogo } from "@khepree/ui";
import { marketingPublicUrl } from "@khepree/config";
import Link from "next/link";
import type { ReactNode } from "react";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import type { AuthCopy } from "@/lib/auth-ui";

export function AuthLayout({ children, copy }: { children: ReactNode; copy: AuthCopy }) {
  return (
    <div className="flex min-h-dvh bg-khepree-cloud">
      <aside className="hidden min-h-dvh lg:block lg:w-[min(44%,520px)] lg:shrink-0">
        <AuthBrandPanel copy={copy} />
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="shrink-0 px-6 py-5 sm:px-8">
          <Link href={marketingPublicUrl()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
            <BrandLogo context="auth" />
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-8">
          <div className="w-full max-w-md rounded-[var(--radius-card)] border border-khepree-mist bg-khepree-white p-6 shadow-sm sm:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
