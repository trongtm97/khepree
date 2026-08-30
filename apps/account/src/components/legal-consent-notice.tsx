import type { SupportedLocale } from "@khepree/config";
import { marketingLegalUrl } from "@/lib/auth-ui";

type LegalConsentCopy = {
  termsImplicit: string;
  termsLink: string;
  termsAnd?: string;
  privacyLink?: string;
};

export function LegalConsentNotice({
  locale,
  copy,
  variant = "terms-and-privacy",
}: {
  locale: SupportedLocale;
  copy: LegalConsentCopy;
  variant?: "terms-and-privacy" | "terms-only";
}) {
  const termsUrl = marketingLegalUrl(locale, "terms");
  const privacyUrl = marketingLegalUrl(locale, "privacy");

  return (
    <p className="text-xs leading-relaxed text-khepree-slate/70">
      {copy.termsImplicit}{" "}
      <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="text-khepree-teal hover:underline">
        {copy.termsLink}
      </a>
      {variant === "terms-and-privacy" && copy.termsAnd && copy.privacyLink ? (
        <>
          {" "}
          {copy.termsAnd}{" "}
          <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="text-khepree-teal hover:underline">
            {copy.privacyLink}
          </a>
        </>
      ) : null}
      .
    </p>
  );
}
