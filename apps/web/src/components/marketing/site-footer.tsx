import Link from "next/link";
import { BrandLogo, Container } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { LanguageSwitcher } from "./language-switcher";

function socialLinks() {
  return [
    { label: "Twitter", url: process.env.NEXT_PUBLIC_SOCIAL_TWITTER },
    { label: "GitHub", url: process.env.NEXT_PUBLIC_SOCIAL_GITHUB },
    { label: "LinkedIn", url: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN },
  ].filter((item): item is { label: string; url: string } => Boolean(item.url?.startsWith("http")));
}

export interface SiteFooterProps {
  locale: SupportedLocale;
  messages: Messages;
}

export function SiteFooter({ locale, messages }: SiteFooterProps) {
  const social = socialLinks();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-khepree-mist bg-khepree-white">
      <Container className="py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <BrandLogo />
            <p className="mt-3 max-w-xs text-sm text-khepree-slate/70">{messages.meta.defaultDescription}</p>
          </div>

          <div>
            <h2 className="text-sm font-semibold">{messages.footer.products}</h2>
            <ul className="mt-3 space-y-2 text-sm text-khepree-slate/70">
              <li>
                <Link href={localePath(locale, "/products")} className="hover:text-khepree-ink">
                  {messages.footer.allProducts}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/pricing")} className="hover:text-khepree-ink">
                  {messages.nav.pricing}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold">{messages.footer.resources}</h2>
            <ul className="mt-3 space-y-2 text-sm text-khepree-slate/70">
              <li>
                <Link href={localePath(locale, "/docs")} className="hover:text-khepree-ink">
                  {messages.footer.docs}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/blog")} className="hover:text-khepree-ink">
                  {messages.footer.blog}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold">{messages.footer.company}</h2>
            <ul className="mt-3 space-y-2 text-sm text-khepree-slate/70">
              <li>
                <Link href={localePath(locale, "/about")} className="hover:text-khepree-ink">
                  {messages.footer.about}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/contact")} className="hover:text-khepree-ink">
                  {messages.footer.contact}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-6 border-t border-khepree-mist pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-khepree-slate/50">
              {messages.footer.legal}
            </h2>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-khepree-slate/70">
              <li>
                <Link href={localePath(locale, "/security")} className="hover:text-khepree-ink">
                  {messages.footer.security}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/privacy")} className="hover:text-khepree-ink">
                  {messages.footer.privacy}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/terms")} className="hover:text-khepree-ink">
                  {messages.footer.terms}
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex items-center gap-2">
              <span className="text-xs text-khepree-slate/50">{messages.footer.language}</span>
              <LanguageSwitcher locale={locale} />
            </div>
            {social.length > 0 ? (
              <ul className="flex gap-4 text-sm text-khepree-slate/70">
                {social.map((item) => (
                  <li key={item.label}>
                    <a href={item.url} rel="noopener noreferrer" target="_blank" className="hover:text-khepree-ink">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <p className="mt-8 text-xs text-khepree-slate/50">
          © {year} Khepree. {messages.footer.copyright}
        </p>
      </Container>
    </footer>
  );
}
