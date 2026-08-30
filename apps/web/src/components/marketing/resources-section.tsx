import { Container, Title } from "@khepree/ui";
import Link from "next/link";
import type { PublishedContent } from "@khepree/catalog";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";

export function ResourcesSection({
  locale,
  messages,
  items,
}: {
  locale: SupportedLocale;
  messages: Messages;
  items: Array<PublishedContent & { href: string }>;
}) {
  if (items.length === 0) return null;

  return (
    <section className="py-16 lg:py-24">
      <Container>
        <Title>{messages.resources.heading}</Title>
        <p className="mt-3 max-w-2xl text-muted">{messages.resources.copy}</p>
        <ul className="mt-10 divide-y divide-border rounded-[var(--radius-card)] border border-border">
          {items.map((item) => (
            <li key={`${item.contentType}-${item.slug}`}>
              <Link
                href={item.href}
                className="flex flex-col gap-1 p-5 transition-colors hover:bg-surface sm:flex-row sm:items-center sm:justify-between sm:p-6"
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
        <div className="mt-8 flex flex-wrap gap-4 text-sm font-medium">
          <Link href={localePath(locale, "/blog")} className="text-teal hover:underline">
            {messages.footer.blog}
          </Link>
          <Link href={localePath(locale, "/docs")} className="text-teal hover:underline">
            {messages.footer.docs}
          </Link>
        </div>
      </Container>
    </section>
  );
}
