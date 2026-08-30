"use client";

import { safeAccountNextPath } from "@khepree/auth/safe-account-next-path";
import { Button } from "@khepree/ui";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { acceptLegalConsentAction } from "@/app/(auth)/actions";
import { LegalConsentNotice } from "@/components/legal-consent-notice";
import type { AuthCopy } from "@/lib/auth-ui";
import type { SupportedLocale } from "@khepree/config";

export function AcceptLegalForm({ copy, locale }: { copy: AuthCopy; locale: SupportedLocale }) {
  const searchParams = useSearchParams();
  const next = safeAccountNextPath(searchParams.get("next"));
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await acceptLegalConsentAction(next);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-khepree-ink">{copy.acceptLegalTitle}</h1>
        <p className="mt-2 text-sm leading-relaxed text-khepree-slate/70">{copy.acceptLegalSubtitle}</p>
      </div>

      <LegalConsentNotice locale={locale} copy={copy} />

      <Button type="submit" className="w-full" disabled={pending}>
        {copy.acceptLegalContinue}
      </Button>
    </form>
  );
}
