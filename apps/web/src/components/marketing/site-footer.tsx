import type { ResolvedKhepreeSurface } from "@khepree/config";
import type { ReactNode } from "react";
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

function FooterLinkList({
  title,
  children,
  collapsible,
}: {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
}) {
  if (collapsible) {
    return (
      <details className="group">
        <summary className="cursor-pointer list-none text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            {title}
            <span aria-hidden className="text-muted transition-transform group-open:rotate-180">
              ▾
            </span>
          </span>
        </summary>
        <div className="mt-3">{children}</div>
      </details>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export interface SiteFooterProps {
  locale: SupportedLocale;
  messages: Messages;
  ecosystemSurfaces: ResolvedKhepreeSurface[];
}

export function SiteFooter({ locale, messages, ecosystemSurfaces }: SiteFooterProps) {
  const social = socialLinks();
  const year = new Date().getFullYear();

  const linkClass = "block min-h-11 py-1 leading-6 text-khepree-slate/70 hover:text-khepree-ink sm:min-h-0 sm:py-0";

  return (
    <footer className="border-t border-khepree-mist bg-khepree-white">
      <Container className="py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-6 lg:gap-10">
          <div className="sm:col-span-2 lg:col-span-2">
            <BrandLogo context="footer" />
            <p className="mt-3 max-w-xs text-sm text-khepree-slate/70">{messages.hero.headline}</p>
          </div>

          <FooterLinkList title={messages.footer.products}>
            <ul className="space-y-1 text-sm sm:space-y-2">
              <li>
                <Link href={localePath(locale, "/products")} className={linkClass}>
                  {messages.footer.allProducts}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/solutions")} className={linkClass}>
                  {messages.nav.solutions}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/pricing")} className={linkClass}>
                  {messages.pages.pricing.title}
                </Link>
              </li>
            </ul>
          </FooterLinkList>

          {ecosystemSurfaces.length > 0 ? (
            <FooterLinkList title={messages.footer.ecosystem} collapsible>
              <ul className="space-y-1 text-sm sm:space-y-2">
                {ecosystemSurfaces.map((surface) => (
                  <li key={surface.id}>
                    <a
                      href={surface.url}
                      target={surface.external ? "_blank" : undefined}
                      rel={surface.external ? "noopener noreferrer" : undefined}
                      className={linkClass}
                    >
                      {surface.label}
                    </a>
                  </li>
                ))}
              </ul>
            </FooterLinkList>
          ) : null}

          <FooterLinkList title={messages.footer.resources}>
            <ul className="space-y-1 text-sm sm:space-y-2">
              <li>
                <Link href={localePath(locale, "/docs")} className={linkClass}>
                  {messages.footer.docs}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/blog")} className={linkClass}>
                  {messages.footer.blog}
                </Link>
              </li>
            </ul>
          </FooterLinkList>

          <FooterLinkList title={messages.footer.company}>
            <ul className="space-y-1 text-sm sm:space-y-2">
              <li>
                <Link href={localePath(locale, "/about")} className={linkClass}>
                  {messages.footer.about}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/contact")} className={linkClass}>
                  {messages.footer.contact}
                </Link>
              </li>
            </ul>
          </FooterLinkList>
        </div>

        <div className="mt-8 flex flex-col gap-6 border-t border-khepree-mist pt-8 sm:mt-10 sm:flex-row sm:items-center sm:justify-between">
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
