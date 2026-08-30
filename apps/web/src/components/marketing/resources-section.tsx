import { Container, Title } from "@khepree/ui";
import Link from "next/link";
import type { PublishedContent } from "@khepree/catalog";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { ButtonLink } from "./button-link";

export function ResourcesSection({
  locale,
  messages,
  items,
}: {
  locale: SupportedLocale;
  messages: Messages;
  items: Array<PublishedContent & { href: string }>;
}) {
  return (
    <section className="py-14 sm:py-16 lg:py-24">
      <Container>
        <Title>{messages.resources.heading}</Title>
        <p className="mt-3 max-w-2xl text-base text-muted">{messages.resources.copy}</p>
        {items.length > 0 ? (
          <ul className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2">
            {items.map((item) => (
              <li key={`${item.contentType}-${item.slug}`}>
                <Link
                  href={item.href}
                  className="flex h-full min-h-11 flex-col gap-1 rounded-[var(--radius-card)] border border-border bg-surface p-5 transition-colors hover:border-teal/30 hover:bg-background sm:p-6"
                >
                  <span className="font-medium text-foreground">{item.title}</span>
                  <span className="text-sm text-muted">
                    {item.contentType === "article" ? messages.footer.blog : messages.footer.docs}
                    {item.excerpt ? ` · ${item.excerpt}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-8">
          <ButtonLink href={localePath(locale, "/docs")} variant="secondary" showArrow>
            {messages.resources.cta}
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
