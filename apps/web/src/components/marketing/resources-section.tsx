import { Container } from "@khepree/ui";
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
    <section className="border-t border-khepree-mist py-16 lg:py-24">
      <Container>
        <h2 className="text-3xl font-semibold tracking-tight">{messages.resources.heading}</h2>
        <p className="mt-3 max-w-2xl text-khepree-slate/80">{messages.resources.copy}</p>
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <li key={`${item.contentType}-${item.slug}`}>
              <Link
                href={item.href}
                className="block rounded-[var(--radius-card)] border border-khepree-mist p-5 hover:border-khepree-teal/40"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-khepree-teal">
                  {item.contentType === "article" ? messages.footer.blog : messages.footer.docs}
                </p>
                <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
                {item.excerpt ? <p className="mt-2 text-sm text-khepree-slate/80">{item.excerpt}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6">
          <Link href={localePath(locale, "/blog")} className="text-sm font-medium text-khepree-teal hover:underline">
            {messages.footer.blog}
          </Link>
        </p>
      </Container>
    </section>
  );
}
