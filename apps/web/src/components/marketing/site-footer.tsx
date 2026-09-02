import { statusPublicUrl, getOutboundLinkAttributes, type ResolvedKhepreeSurface } from "@khepree/config";
import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogo, Container } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { ExternalLink } from "./external-link";
import { LanguageSwitcher } from "./language-switcher";
import { OfficialContactFooterIcons } from "./official-contact-channels";

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
  const year = new Date().getFullYear();
  const statusUrl = statusPublicUrl();

  const linkClass =
    "block min-h-10 py-1.5 leading-6 text-muted transition-colors hover:text-foreground sm:min-h-0 sm:py-0";

  return (
    <footer className="border-t border-border bg-surface">
      <Container className="section-py-compact">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-7 lg:gap-10">
          <div className="sm:col-span-2 lg:col-span-2">
            <BrandLogo context="footer" />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{messages.meta.defaultDescription}</p>
          </div>

          <FooterLinkList title={messages.footer.products}>
            <ul className="space-y-1 text-sm sm:space-y-2">
              <li>
                <Link href={localePath(locale, "/products")} className={linkClass}>
                  {messages.footer.allProducts}
                </Link>
              </li>
            </ul>
          </FooterLinkList>

          <FooterLinkList title={messages.footer.resources}>
            <ul className="space-y-1 text-sm sm:space-y-2">
              <li>
                <Link href={localePath(locale, "/blog")} className={linkClass}>
                  {messages.footer.blog}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/docs")} className={linkClass}>
                  {messages.footer.docs}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/changelog")} className={linkClass}>
                  {messages.footer.changelog}
                </Link>
              </li>
            </ul>
          </FooterLinkList>

          <FooterLinkList title={messages.footer.support}>
            <ul className="space-y-1 text-sm sm:space-y-2">
              <li>
                <Link href={localePath(locale, "/support")} className={linkClass}>
                  {messages.footer.supportCenter}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/contact")} className={linkClass}>
                  {messages.footer.contact}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/security")} className={linkClass}>
                  {messages.footer.security}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/trust")} className={linkClass}>
                  {messages.footer.trust}
                </Link>
              </li>
              {statusUrl ? (
                <li>
                  <ExternalLink href={statusUrl} className={linkClass}>
                    {messages.footer.status}
                  </ExternalLink>
                </li>
              ) : null}
            </ul>
          </FooterLinkList>

          <FooterLinkList title={messages.footer.company}>
            <ul className="space-y-1 text-sm sm:space-y-2">
              <li>
                <Link href={localePath(locale, "/about")} className={linkClass}>
                  {messages.footer.about}
                </Link>
              </li>
            </ul>
          </FooterLinkList>

          {ecosystemSurfaces.length > 0 ? (
            <FooterLinkList title={messages.footer.ecosystem} collapsible>
              <ul className="space-y-1 text-sm sm:space-y-2">
                {ecosystemSurfaces.map((surface) => {
                  const outbound = getOutboundLinkAttributes(surface.url, {
                    forceNewTab: surface.openBehavior === "new-tab",
                  });
                  return (
                    <li key={surface.id}>
                      <a href={surface.url} className={linkClass} {...outbound}>
                        {surface.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </FooterLinkList>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col gap-6 border-t border-border pt-6 sm:mt-10 sm:flex-row sm:items-start sm:justify-between sm:pt-8">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{messages.footer.legal}</h2>
            <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
              <li>
                <Link href={localePath(locale, "/privacy")} className="transition-colors hover:text-foreground">
                  {messages.footer.privacy}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/terms")} className="transition-colors hover:text-foreground">
                  {messages.footer.terms}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/refund")} className="transition-colors hover:text-foreground">
                  {messages.footer.refund}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/eula")} className="transition-colors hover:text-foreground">
                  {messages.footer.eula}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/cookies")} className="transition-colors hover:text-foreground">
                  {messages.footer.cookies}
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-4 sm:items-end">
            <OfficialContactFooterIcons messages={messages} />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">{messages.footer.language}</span>
              <LanguageSwitcher locale={locale} />
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs text-muted sm:mt-8">
          © {year} Khepree. {messages.footer.copyright}
        </p>
      </Container>
    </footer>
  );
}
