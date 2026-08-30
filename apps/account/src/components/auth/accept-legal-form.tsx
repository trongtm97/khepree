"use client";

import { safeAccountNextPath } from "@khepree/auth/safe-account-next-path";
import { Alert, Button, Checkbox } from "@khepree/ui";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptLegalConsentAction } from "@/app/(auth)/actions";
import { marketingLegalUrl, type AuthCopy } from "@/lib/auth-ui";
import type { SupportedLocale } from "@khepree/config";

export function AcceptLegalForm({ copy, locale }: { copy: AuthCopy; locale: SupportedLocale }) {
  const searchParams = useSearchParams();
  const next = safeAccountNextPath(searchParams.get("next"));
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const termsUrl = marketingLegalUrl(locale, "terms");
  const privacyUrl = marketingLegalUrl(locale, "privacy");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) {
      setError(copy.termsRequired);
      return;
    }
    setError(null);
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

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Checkbox
        checked={accepted}
        onChange={(e) => setAccepted(e.target.checked)}
        label={
          <>
            {copy.termsPrefix}{" "}
            <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="text-khepree-teal hover:underline">
              {copy.termsLink}
            </a>{" "}
            {copy.termsAnd}{" "}
            <a
              href={privacyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-khepree-teal hover:underline"
            >
              {copy.privacyLink}
            </a>
          </>
        }
      />

      <Button type="submit" className="w-full" disabled={pending}>
        {copy.acceptLegalContinue}
      </Button>
    </form>
  );
}
